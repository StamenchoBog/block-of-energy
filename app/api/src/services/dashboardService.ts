
import { getDatabase } from '../config/database';
import { TasmotaDevice, DashboardSummary } from '../types';

class DashboardService {
    async getDashboardData(): Promise<DashboardSummary> {
        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');

        // Get the latest device data
        const latestDevice = await collection.findOne(
            { "payload.ENERGY": { $exists: true } },
            { sort: { processingTimestamp: -1 } }
        ) as TasmotaDevice | null;

        if (!latestDevice || !latestDevice.payload.ENERGY) {
            throw new Error('No energy data found');
        }

        // Get hourly data
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const oneDayAgoStr = oneDayAgo.toISOString();

        const hourlyData = await collection.find({
            "payload.ENERGY": { $exists: true },
            $or: [
                { "payload.timestamp": { $gte: oneDayAgoStr } },
                { "processingTimestamp": { $gte: oneDayAgoStr } }
            ]
        }, {
            sort: { "processingTimestamp": 1 },
            limit: 1440
        }).toArray() as TasmotaDevice[];

        // Get daily aggregations
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();

        const dailyAggregation = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    $or: [
                        { processingTimestamp: { $gte: sevenDaysAgo } },
                        { processingTimestamp: { $gte: sevenDaysAgoStr } }
                    ]
                }
            },
            {
                $addFields: {
                    dateString: {
                        $substr: [
                            { $ifNull: ["$processingTimestamp", new Date().toISOString()] },
                            0,
                            10
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$dateString",
                    avgPower: { $avg: "$payload.ENERGY.Power" },
                    maxPower: { $max: "$payload.ENERGY.Power" },
                    minPower: { $min: "$payload.ENERGY.Power" },
                    energyConsumed: { $max: "$payload.ENERGY.Today" },
                    readingCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Get today's data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const todayData = await collection.find({
            "payload.ENERGY": { $exists: true },
            $or: [
                { processingTimestamp: { $gte: today } },
                { processingTimestamp: { $gte: todayStr } }
            ]
        }, {
            sort: { processingTimestamp: 1 },
            limit: 1440
        }).toArray() as TasmotaDevice[];

        const energy = latestDevice.payload.ENERGY;
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
            energyTotal: { value: energy.Total.toString() },

            hourlyPowerData: hourlyData.map((item: TasmotaDevice) => ({
                timestamp: new Date(item.payload.timestamp || item.processingTimestamp),
                power: item.payload.ENERGY!.Power,
                energy: item.payload.ENERGY!.Today
            })),

            dailySummary: dailyAggregation,

            todayData: todayData.map((item: TasmotaDevice) => ({
                timestamp: new Date(item.payload.TIME ? item.payload.TIME.UTC || item.processingTimestamp : item.processingTimestamp),
                power: item.payload.ENERGY!.Power,
                voltage: item.payload.ENERGY!.Voltage,
                energy: item.payload.ENERGY!.Today
            }))
        };

        return summary;
    }
}

export default new DashboardService();
