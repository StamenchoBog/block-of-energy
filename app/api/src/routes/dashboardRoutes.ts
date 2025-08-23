import express, { Router } from 'express';
import { ApiRequest, ApiResponse } from '../types';
import dashboardService from '../services/dashboardService';

const router: Router = express.Router();

// Get dashboard overview data
router.get('/dashboard_overview_data', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const summary = await dashboardService.getDashboardData();
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