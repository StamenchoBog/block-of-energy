import { subDays, subHours, startOfDay, parseISO } from 'date-fns';
import { getDatabase } from '../config/database';
import { TasmotaDevice, DashboardSummary } from '../types';
import { getCostService } from './costService';

class DashboardService {
    /**
     * Calculate consumption deltas from cumulative meter readings.
     *
     * Important: Tasmota's ENERGY.Today is cumulative within a day and resets at midnight.
     * - For hourly data: we need delta calculation (each hour's consumption = current - previous)
     * - For daily data: MAX(ENERGY.Today) per day IS the daily consumption (no delta needed)
     *
     * @param data - Array of readings with energy values
     * @param sortKey - Key to sort by (for chronological order)
     * @param skipFirst - If true, excludes the first item (used as baseline only)
     */
    private calculateHourlyConsumption(
        data: Array<{ energy: number; timestamp: string; [key: string]: any }>,
        skipFirst: boolean = true
    ): Array<{ energy: number; consumption: number; timestamp: string; [key: string]: any }> {
        if (!data || data.length === 0) return [];

        // Sort by timestamp to ensure chronological order
        const sorted = [...data].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        let previousEnergy = 0;
        const results = sorted.map((item, index) => {
            const currentEnergy = item.energy || 0;
            let consumption: number;

            if (index === 0) {
                // First reading: used as baseline, consumption will be excluded if skipFirst=true
                consumption = 0;
            } else if (currentEnergy < previousEnergy) {
                // Meter reset detected (midnight), use current value as consumption
                consumption = currentEnergy;
            } else {
                // Normal case: calculate delta
                consumption = Math.max(0, currentEnergy - previousEnergy);
            }

            previousEnergy = currentEnergy;
            return {
                ...item,
                consumption: Math.round(consumption * 100) / 100
            };
        });

        // Skip the first item if it was just used as a baseline
        return skipFirst ? results.slice(1) : results;
    }
    /**
     * Get dashboard data, optionally filtered by device
     * @param deviceId - Optional: filter by specific device (e.g., 'tasmota_dishwasher_001')
     * @param deviceType - Optional: filter by device type ('tasmota' | 'shelly_pro_3em')
     */
    async getDashboardData(deviceId?: string, deviceType?: string): Promise<DashboardSummary> {
        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');
        const now = new Date();
        const twentyFiveHoursAgo = subHours(now, 25);
        const sevenDaysAgo = subDays(now, 7);
        const todayStart = startOfDay(now);

        // Build dynamic match filter
        const matchFilter: Record<string, unknown> = {
            processingTimestamp: { $gte: sevenDaysAgo.toISOString() }
        };

        // Add device filters if provided
        if (deviceId) {
            matchFilter.deviceId = deviceId;
        }
        if (deviceType) {
            matchFilter.deviceType = deviceType;
        }

        // Default to Tasmota ENERGY format if no type specified (backward compatible)
        if (!deviceType) {
            matchFilter["payload.ENERGY"] = { $exists: true };
        }

        // Use $facet to combine all queries into a single database round-trip
        const [result] = await collection.aggregate([
            { $match: matchFilter },
            {
                $facet: {
                    // Get latest device reading
                    latest: [
                        { $sort: { processingTimestamp: -1 } },
                        { $limit: 1 }
                    ],
                    hourlyData: [
                        { $match: { processingTimestamp: { $gte: twentyFiveHoursAgo.toISOString() } } },
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: "%Y-%m-%dT%H:00:00.000Z",
                                        date: { $toDate: { $ifNull: ["$payload.timestamp", "$processingTimestamp"] } }
                                    }
                                },
                                power: { $avg: "$payload.ENERGY.Power" },
                                peakPower: { $max: "$payload.ENERGY.Power" },
                                energy: { $max: "$payload.ENERGY.Today" }
                            }
                        },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                timestamp: "$_id",
                                power: { $round: ["$power", 1] },
                                peakPower: { $round: ["$peakPower", 1] },
                                energy: 1
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

        const safeToString = (value: number | null | undefined, fallback = '0'): string => {
            return (value !== null && value !== undefined) ? value.toString() : fallback;
        };

        const costService = getCostService();

        // Process hourly data with consumption deltas (skipFirst=true excludes baseline hour)
        const hourlyWithDeltas = this.calculateHourlyConsumption(
            result.hourlyData.map((item: any) => ({
                timestamp: item.timestamp,
                power: item.power,
                peakPower: item.peakPower,
                energy: item.energy || 0
            })),
            true  // Skip first hour (used as baseline only)
        );

        // Daily summary: MAX(ENERGY.Today) IS the daily consumption (meter resets at midnight)
        // No delta calculation needed - just use the raw energyConsumed values
        const dailySummaryData = result.dailySummary.map((item: any) => ({
            date: item._id,
            avgPower: item.avgPower,
            maxPower: item.maxPower,
            minPower: item.minPower,
            energyConsumed: item.energyConsumed || 0,
            readingCount: item.readingCount
        }));

        // Calculate actual cost based on hourly consumption and tariffs
        const tariffConfig = costService.getTariffConfig();
        let totalCost = 0;
        for (const hour of hourlyWithDeltas) {
            const timestamp = parseISO(hour.timestamp);
            const cost = costService.calculateReadingCost(hour.consumption, timestamp);
            totalCost += cost.cost;
        }

        // If no hourly data yet, fall back to estimate
        const energyToday = energy.Today || 0;
        const currentHour = now.getHours();
        const estimatedCost = hourlyWithDeltas.length > 0
            ? {
                value: Math.round(totalCost * 100) / 100,
                currency: tariffConfig.currency,
                confidence: currentHour < 8 ? 'low' as const : currentHour < 16 ? 'medium' as const : 'high' as const,
                projectedDaily: currentHour > 0
                    ? Math.round((totalCost / currentHour) * 24 * 100) / 100
                    : totalCost
            }
            : costService.calculateTodayEstimate(energyToday, currentHour);

        const summary: DashboardSummary = {
            power: {
                value: safeToString(energy.Power),
                processingTimestamp: parseISO(latestDevice.processingTimestamp)
            },
            voltage: { value: safeToString(energy.Voltage) },
            current: { value: safeToString(energy.Current) },
            energyToday: { value: safeToString(energy.Today) },
            powerFactor: { value: safeToString(energy.Factor) },
            apparentPower: { value: safeToString(energy.ApparentPower) },
            reactivePower: { value: safeToString(energy.ReactivePower) },
            energyTotal: { value: safeToString(energy.Total) },

            // Use consumption (delta) instead of raw energy reading
            hourlyPowerData: hourlyWithDeltas.map((item) => ({
                timestamp: parseISO(item.timestamp),
                power: item.power,
                energy: item.consumption  // Now shows actual consumption per hour
            })),

            // Daily summary uses MAX(ENERGY.Today) directly - correct since meter resets daily
            dailySummary: dailySummaryData.map((item: typeof dailySummaryData[0]) => ({
                _id: item.date,
                avgPower: item.avgPower,
                maxPower: item.maxPower,
                minPower: item.minPower,
                energyConsumed: item.energyConsumed,
                readingCount: item.readingCount
            })),

            todayData: result.todayData.map((item: any) => ({
                timestamp: parseISO(item.timestamp),
                power: item.power,
                voltage: item.voltage,
                energy: item.energy
            })),
            estimatedCost
        };

        return summary;
    }
}

export default new DashboardService();
