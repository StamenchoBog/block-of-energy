import express, { Router } from 'express';
import { ApiRequest, ApiResponse } from '../types';
import dashboardService from '../services/dashboardService';
import cacheService from '../services/cacheService';

const router: Router = express.Router();

const DASHBOARD_CACHE_KEY = 'dashboard:overview';
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get dashboard overview data
router.get('/dashboard_overview_data', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const cached = cacheService.get(DASHBOARD_CACHE_KEY);
        if (cached) {
            return res.json(cached);
        }

        const summary = await dashboardService.getDashboardData();
        cacheService.set(DASHBOARD_CACHE_KEY, summary, DASHBOARD_CACHE_TTL);

        res.json(summary);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'No energy data found') {
            return res.status(404).json({ error: errorMessage });
        }
        res.status(500).json({ error: 'Failed to fetch dashboard data', message: errorMessage });
    }
});

export default router;