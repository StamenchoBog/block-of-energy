import express, { Router } from 'express';
import { ApiRequest, ApiResponse } from '../types';
import dashboardService from '../services/dashboardService';
import cacheService from '../services/cacheService';
import { getDatabase } from '../config/database';

const router: Router = express.Router();

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Build cache key based on query params
const getCacheKey = (deviceId?: string, deviceType?: string): string => {
    const parts = ['dashboard:overview'];
    if (deviceId) parts.push(`device:${deviceId}`);
    if (deviceType) parts.push(`type:${deviceType}`);
    return parts.join(':');
};

// Get dashboard overview data
// Query params: ?deviceId=tasmota_dishwasher_001&deviceType=tasmota
router.get('/dashboard_overview_data', async (req: ApiRequest, res: ApiResponse) => {
    try {
        const deviceId = req.query.deviceId as string | undefined;
        const deviceType = req.query.deviceType as string | undefined;

        const cacheKey = getCacheKey(deviceId, deviceType);
        const cached = cacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const summary = await dashboardService.getDashboardData(deviceId, deviceType);
        cacheService.set(cacheKey, summary, DASHBOARD_CACHE_TTL);

        res.json(summary);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'No energy data found') {
            return res.status(404).json({ error: errorMessage });
        }
        res.status(500).json({ error: 'Failed to fetch dashboard data', message: errorMessage });
    }
});

router.get('/devices', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const cached = cacheService.get('devices:list');
        if (cached) {
            return res.json(cached);
        }

        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');

        // Get distinct devices with their types
        const devices = await collection.aggregate([
            {
                $group: {
                    _id: '$deviceId',
                    deviceType: { $first: '$deviceType' },
                    lastSeen: { $max: '$processingTimestamp' },
                    isSimulated: { $first: '$isSimulated' }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        const result = devices.map(d => ({
            deviceId: d._id,
            deviceType: d.deviceType || 'tasmota',  // Default for legacy data
            lastSeen: d.lastSeen,
            isSimulated: d.isSimulated || false
        }));

        cacheService.set('devices:list', result, 60 * 1000); // 1 min cache
        res.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch devices', message: errorMessage });
    }
});

export default router;