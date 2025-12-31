import express, { Router } from 'express';
import { ApiRequest, ApiResponse } from '../types';
import predictionService, { PredictionServiceError } from '../services/predictionService';
import cacheService from '../services/cacheService';

const router: Router = express.Router();

const CACHE_TTL = parseInt(process.env.PREDICTION_CACHE_TTL || '300000', 10);
const FORECAST_CACHE_KEY = 'predictions:forecast';
const ANOMALIES_CACHE_KEY = 'predictions:anomalies';
const MODEL_STATUS_CACHE_KEY = 'predictions:model:status';
const MODEL_STATUS_CACHE_TTL = 60000; // 1 minute for status

function handlePredictionError(error: unknown, res: ApiResponse, operation: string): void {
    if (error instanceof PredictionServiceError) {
        const statusCode = error.isServiceUnavailable ? 503 : error.statusCode;
        res.status(statusCode).json({
            error: error.message,
            error_code: error.errorCode || (error.isServiceUnavailable ? 'SERVICE_UNAVAILABLE' : undefined),
            operation,
        });
        return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
        error: 'Internal server error',
        error_code: 'INTERNAL_ERROR',
        message,
        operation,
    });
}

// GET /predictions/forecast
router.get('/predictions/forecast', async (req: ApiRequest, res: ApiResponse) => {
    try {
        const hours = parseInt(req.query.hours as string, 10) || 24;
        const pastContextHours = parseInt(req.query.past_context_hours as string, 10) || 0;

        if (hours < 1 || hours > 168) {
            return res.status(400).json({
                error: 'Invalid hours parameter',
                error_code: 'INVALID_PARAMETER',
                message: 'Hours must be between 1 and 168 (7 days)',
            });
        }

        // Include pastContextHours in cache key for proper cache isolation
        const cacheKey = `${FORECAST_CACHE_KEY}:${hours}:${pastContextHours}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const forecast = await predictionService.getForecast(hours, pastContextHours);
        cacheService.set(cacheKey, forecast, CACHE_TTL);

        res.json(forecast);
    } catch (error) {
        handlePredictionError(error, res, 'forecast');
    }
});

// GET /predictions/anomalies
router.get('/predictions/anomalies', async (req: ApiRequest, res: ApiResponse) => {
    try {
        const hours = parseInt(req.query.hours as string, 10) || 24;
        const sensitivity = parseFloat(req.query.sensitivity as string) || 0.8;

        if (hours < 1 || hours > 168) {
            return res.status(400).json({
                error: 'Invalid hours parameter',
                error_code: 'INVALID_PARAMETER',
                message: 'Hours must be between 1 and 168 (7 days)',
            });
        }

        if (sensitivity < 0 || sensitivity > 1) {
            return res.status(400).json({
                error: 'Invalid sensitivity parameter',
                error_code: 'INVALID_PARAMETER',
                message: 'Sensitivity must be between 0 and 1',
            });
        }

        const cacheKey = `${ANOMALIES_CACHE_KEY}:${hours}:${sensitivity}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const anomalies = await predictionService.getAnomalies(hours, sensitivity);
        cacheService.set(cacheKey, anomalies, CACHE_TTL);

        res.json(anomalies);
    } catch (error) {
        handlePredictionError(error, res, 'anomalies');
    }
});

// GET /predictions/model/status
router.get('/predictions/model/status', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const cached = cacheService.get(MODEL_STATUS_CACHE_KEY);
        if (cached) {
            return res.json(cached);
        }

        const status = await predictionService.getModelStatus();
        cacheService.set(MODEL_STATUS_CACHE_KEY, status, MODEL_STATUS_CACHE_TTL);

        res.json(status);
    } catch (error) {
        handlePredictionError(error, res, 'model-status');
    }
});

// POST /predictions/model/train
router.post('/predictions/model/train', async (_req: ApiRequest, res: ApiResponse) => {
    try {
        const result = await predictionService.triggerTraining();
        cacheService.invalidate('predictions:*');

        res.json(result);
    } catch (error) {
        handlePredictionError(error, res, 'model-train');
    }
});

export default router;