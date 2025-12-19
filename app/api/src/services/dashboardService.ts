
import { getDatabase } from '../config/database';
import { TasmotaDevice, DashboardSummary } from '../types';

class DashboardService {
    async getDashboardData(): Promise<DashboardSummary> {
        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Use $facet to combine all queries into a single database round-trip
        const [result] = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    processingTimestamp: { $gte: sevenDaysAgo.toISOString() }
                }
            },
            {
                $facet: {
                    // Get latest device reading
                    latest: [
                        { $sort: { processingTimestamp: -1 } },
                        { $limit: 1 }
                    ],
                    // Get 24-hour hourly data
                    hourlyData: [
                        { $match: { processingTimestamp: { $gte: oneDayAgo.toISOString() } } },
                        { $sort: { processingTimestamp: 1 } },
                        { $limit: 1440 },
                        {
                            $project: {
                                timestamp: { $ifNull: ["$payload.timestamp", "$processingTimestamp"] },
                                power: "$payload.ENERGY.Power",
                                energy: "$payload.ENERGY.Today"
                            }
                        }
                    ],
                    // Get daily aggregations for 7 days
                    dailySummary: [
                        {
                            $group: {
                                _id: { $substr: ["$processingTimestamp", 0, 10] },
                                avgPower: { $avg: "$payload.ENERGY.Power" },
                                maxPower: { $max: "$payload.ENERGY.Power" },
                                minPower: { $min: "$payload.ENERGY.Power" },
                                energyConsumed: { $max: "$payload.ENERGY.Today" },
                                readingCount: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // Get today's detailed data
                    todayData: [
                        { $match: { processingTimestamp: { $gte: todayStart.toISOString() } } },
                        { $sort: { processingTimestamp: 1 } },
                        { $limit: 1440 },
                        {
                            $project: {
                                timestamp: {
                                    $ifNull: [
                                        "$payload.TIME.UTC",
                                        { $ifNull: ["$payload.timestamp", "$processingTimestamp"] }
                                    ]
                                },
                                power: "$payload.ENERGY.Power",
                                voltage: "$payload.ENERGY.Voltage",
                                energy: "$payload.ENERGY.Today"
                            }
                        }
                    ]
                }
            }
        ]).toArray();

        const latestDevice = result.latest[0] as TasmotaDevice | undefined;

        if (!latestDevice || !latestDevice.payload.ENERGY) {
            const summary: DashboardSummary = {
                power: { value: '0', processingTimestamp: new Date() },
                voltage: { value: '0' },
                current: { value: '0' },
                energyToday: { value: '0' },
                powerFactor: { value: '0' },
                apparentPower: { value: '0' },
                reactivePower: { value: '0' },
                energyTotal: { value: '0' },
                hourlyPowerData: [],
                dailySummary: [],
                todayData: []
            };
            return summary;
        }

        const energy = latestDevice.payload.ENERGY;
        
        // Handle potentially missing Total field and calculate if needed
        const totalEnergy = energy.Total || 
            (energy.Total !== undefined && energy.Total !== null) ? energy.Total : 
            energy.Today || 0; // Fallback to today's energy if Total is not available
        
        const summary: DashboardSummary = {
            power: {
                value: energy.Power.toString(),
                processingTimestamp: new Date(latestDevice.processingTimestamp)
            },
            voltage: { value: energy.Voltage.toString() },
            current: { value: energy.Current.toString() },
            energyToday: { value: energy.Today.toString() },
            powerFactor: { value: energy.Factor.toString() },
            apparentPower: { value: energy.ApparentPower.toString() },
            reactivePower: { value: energy.ReactivePower.toString() },
            energyTotal: { value: totalEnergy.toString() },

            hourlyPowerData: result.hourlyData.map((item: any) => ({
                timestamp: new Date(item.timestamp),
                power: item.power,
                energy: item.energy
            })),

            dailySummary: result.dailySummary,

            todayData: result.todayData.map((item: any) => ({
                timestamp: new Date(item.timestamp),
                power: item.power,
                voltage: item.voltage,
                energy: item.energy
            }))
        };

        return summary;
    }
}

export default new DashboardService();
