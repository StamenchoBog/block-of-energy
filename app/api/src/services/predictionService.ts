import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';
import {
    ForecastResponse,
    AnomalyResponse,
    ModelStatus,
    TrainResponse
} from '../types';

class PredictionServiceError extends Error {
    constructor(
        message: string,
        public statusCode: number = 502,
        public isServiceUnavailable: boolean = false,
        public errorCode?: string
    ) {
        super(message);
        this.name = 'PredictionServiceError';
    }
}

class PredictionService {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.PREDICTION_SERVICE_URL || '';
        const timeout = parseInt(process.env.PREDICTION_SERVICE_TIMEOUT || '30000', 10);

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    private handleError(error: unknown, operation: string): never {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
                logger.error(`Prediction service unavailable during ${operation}:`, {
                    code: error.code,
                    baseUrl: this.baseUrl,
                });
                throw new PredictionServiceError(
                    'Prediction service unavailable',
                    503,
                    true
                );
            }

            if (error.response) {
                const statusCode = error.response.status;
                const data = error.response.data as Record<string, unknown> | undefined;
                const message = data?.detail || data?.error || error.message;
                const errorCode = data?.error_code as string | undefined;
                logger.error(`Prediction service error during ${operation}:`, {
                    statusCode,
                    message,
                    errorCode,
                });
                throw new PredictionServiceError(
                    String(message),
                    statusCode >= 500 ? 502 : statusCode,
                    false,
                    errorCode
                );
            }
        }

        logger.error(`Unexpected error during ${operation}:`, error);
        throw new PredictionServiceError('Unexpected error communicating with prediction service');
    }

    async getForecast(hours: number = 24, pastContextHours: number = 0): Promise<ForecastResponse> {
        try {
            logger.info('Fetching forecast from prediction service', { hours, pastContextHours });
            const response = await this.client.get<ForecastResponse>('/forecast', {
                params: { hours, past_context_hours: pastContextHours },
            });
            return response.data;
        } catch (error) {
            this.handleError(error, 'getForecast');
        }
    }

    async getAnomalies(hours: number = 24, sensitivity: number = 0.8): Promise<AnomalyResponse> {
        try {
            logger.info('Fetching anomalies from prediction service', { hours, sensitivity });
            const response = await this.client.get<AnomalyResponse>('/anomalies', {
                params: { hours, sensitivity },
            });
            return response.data;
        } catch (error) {
            this.handleError(error, 'getAnomalies');
        }
    }

    async getModelStatus(): Promise<ModelStatus> {
        try {
            logger.info('Fetching model status from prediction service');
            const response = await this.client.get<ModelStatus>('/model/status');
            return response.data;
        } catch (error) {
            this.handleError(error, 'getModelStatus');
        }
    }

    async triggerTraining(): Promise<TrainResponse> {
        try {
            logger.info('Triggering model training');
            const response = await this.client.post<TrainResponse>('/model/train');
            return response.data;
        } catch (error) {
            this.handleError(error, 'triggerTraining');
        }
    }
}

export { PredictionServiceError };
export default new PredictionService();