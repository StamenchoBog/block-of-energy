import express, { Router } from 'express';
import { getDatabase } from '../config/database';
import { ApiRequest, ApiResponse, TasmotaDevice, DashboardSummary } from '../types';

const router: Router = express.Router();

// Get dashboard overview data
router.get('/dashboard_overview_data', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');

        // Get the latest device data
        const latestDevice = await collection.findOne(
            { "payload.ENERGY": { $exists: true } },
            { sort: { processingTimestamp: -1 } }
        ) as TasmotaDevice | null;

        if (!latestDevice || !latestDevice.payload.ENERGY) {
            return res.status(404).json({ error: 'No energy data found' });
        }

        // Get hourly data - Use string comparison if timestamps are stored as strings
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const oneDayAgoStr = oneDayAgo.toISOString();

        // Try both date object and string comparison
        const hourlyData = await collection.find({
            "payload.ENERGY": { $exists: true },
            $or: [
                { "payload.timestamp": { $gte: oneDayAgoStr } },
                { "processingTimestamp": { $gte: oneDayAgoStr } }
            ]
        }, {
            sort: { "processingTimestamp": 1 },
            limit: 1440  // Limit to 1 reading per minute for 24h
        }).toArray() as TasmotaDevice[];

        // Get daily aggregations with simpler query
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

        // Get today's data with simpler query
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
            limit: 1440  // Max 1 reading per minute
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

        res.json(summary);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch dashboard data', message: errorMessage });
    }
});

export default router;
