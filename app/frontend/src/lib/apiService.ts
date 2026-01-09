const API_URL = import.meta.env.PUBLIC_API_URL || '';

const logger = {
    error: (message: string, error: unknown) => {
        console.error(`[API Error] ${message}`, error);
    },
    warn: (message: string) => {
        console.warn(`[API Warning] ${message}`);
    }
};

interface ReportParams {
    type: string;
    date?: string;
    week?: string;
    month?: string;
    year?: string;
    [key: string]: string | undefined;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
}

// Prediction types
export interface ForecastPrediction {
    timestamp: string;
    predicted_power: number;
    lower_bound: number;
    upper_bound: number;
}

export interface ModelInfo {
    name: string;
    accuracy_mape: number;
    last_trained: string;
}

export interface ForecastResponse {
    predictions: ForecastPrediction[];
    model_info: ModelInfo;
}

export interface Anomaly {
    timestamp: string;
    actual_power: number;
    expected_power: number;
    anomaly_score: number;
    anomaly_type: 'spike' | 'dip' | 'pattern_change';
}

export interface AnomalySummary {
    total_count: number;
    severity: 'low' | 'medium' | 'high';
}

export interface AnomalyResponse {
    anomalies: Anomaly[];
    summary: AnomalySummary;
}

// Enhanced Report Response types
export interface ReportSummary {
    totalEnergy: number;
    avgPower: number;
    peakPower: number;
    comparison?: PeriodComparison;
}

export interface PeriodComparison {
    previousPeriod: {
        totalEnergy: number;
        avgPower: number;
        peakPower: number;
    };
    changes: {
        energyChange: number;
        avgPowerChange: number;
        peakPowerChange: number;
    };
    label: string;
}

export interface ReportAnomalySummary {
    totalCount: number;
    severity: 'low' | 'medium' | 'high';
    byType: {
        spikes: number;
        dips: number;
        patternChanges: number;
    };
}

export interface DeviceBreakdown {
    deviceId: string;
    totalEnergy: number;
    percentage: number;
    avgPower: number;
    peakPower: number;
}

export interface EnhancedReportResponse {
    reportType: string;
    date: string;
    week?: number;
    month?: number;
    year: number | string;
    data: any[];
    summary?: ReportSummary;
    anomalySummary?: ReportAnomalySummary;
    deviceBreakdown?: DeviceBreakdown[];
}

export type PredictionErrorType = 'training' | 'unavailable' | 'timeout' | 'error' | 'collecting_data';

export interface PredictionError {
    type: PredictionErrorType;
    message: string;
}

export interface DataCollectionStatus {
    status: 'collecting_data';
    days_available: number;
    days_required: number;
    progress_percent: number;
    message: string;
}

export interface PredictionResult<T> {
    data: T | null;
    error?: PredictionError;
}

// Type guard to check if response is a DataCollectionStatus
function isDataCollectionStatus(data: unknown): data is DataCollectionStatus {
    return typeof data === 'object' && data !== null &&
        'status' in data && (data as DataCollectionStatus).status === 'collecting_data';
}

// Shared prediction API error handling utilities
async function handlePredictionResponse<T>(
    response: Response,
    operationName: string
): Promise<PredictionResult<T>> {
    if (!response.ok) {
        let errorMessage = 'Service unavailable';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
            // Ignore JSON parse errors
        }

        const isTraining = response.status === 503 &&
            errorMessage.toLowerCase().includes('training');

        if (isTraining) {
            logger.warn(`${operationName} model is training`);
            return { data: null, error: { type: 'training', message: errorMessage } };
        }

        if (response.status === 503 || response.status === 502) {
            logger.warn(`${operationName} service unavailable`);
            return { data: null, error: { type: 'unavailable', message: errorMessage } };
        }

        return { data: null, error: { type: 'error', message: `API error: ${response.status}` } };
    }

    const data = await response.json();

    // Check if response indicates data collection in progress
    if (isDataCollectionStatus(data)) {
        logger.warn(`${operationName}: ${data.message}`);
        return {
            data: null,
            error: {
                type: 'collecting_data',
                message: data.message
            },
            collectionStatus: data
        } as PredictionResult<T> & { collectionStatus: DataCollectionStatus };
    }

    return { data };
}

function handlePredictionError<T>(
    error: unknown,
    operationName: string
): PredictionResult<T> {
    if ((error as Error).name === 'AbortError') {
        logger.error(`${operationName} API request timed out`, error);
        return { data: null, error: { type: 'timeout', message: 'Request timed out' } };
    }
    logger.error(`Error fetching ${operationName} data:`, error);
    return { data: null, error: { type: 'error', message: (error as Error).message } };
}

function createPredictionFetcher<T>(
    endpoint: string,
    operationName: string,
    timeout: number = 45000
) {
    return async (params: URLSearchParams): Promise<PredictionResult<T>> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(
                `${API_URL}/api/predictions/${endpoint}?${params.toString()}`,
                {
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            clearTimeout(timeoutId);
            return handlePredictionResponse<T>(response, operationName);
        } catch (error) {
            clearTimeout(timeoutId);
            return handlePredictionError<T>(error, operationName);
        }
    };
}

/**
 * Fetches report data based on provided parameters
 */
export async function fetchReportData(params: ReportParams): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) queryParams.set(key, value);
        });

        const response = await fetch(`${API_URL}/api/report?${queryParams.toString()}`, {
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        logger.error('Error fetching report data:', error);
        return null;
    }
}

// Create prediction fetchers using the factory
const fetchForecastInternal = createPredictionFetcher<ForecastResponse>('forecast', 'Forecast');
const fetchAnomaliesInternal = createPredictionFetcher<AnomalyResponse>('anomalies', 'Anomalies');

// Ratio of past context to show (33% past, 67% future)
const PAST_CONTEXT_RATIO = 0.33;

/**
 * Fetches forecast predictions from the prediction service.
 * Automatically includes ~33% past context for hindcast visualization.
 */
export async function fetchForecast(hours: number = 24): Promise<PredictionResult<ForecastResponse>> {
    // Calculate past context hours (33% of forecast, rounded)
    const pastContextHours = Math.round(hours * PAST_CONTEXT_RATIO);

    const params = new URLSearchParams({
        hours: hours.toString(),
        past_context_hours: pastContextHours.toString()
    });
    return fetchForecastInternal(params);
}

/**
 * Fetches anomaly detection results from the prediction service
 */
export async function fetchAnomalies(hours: number = 24, sensitivity: number = 0.8): Promise<PredictionResult<AnomalyResponse>> {
    const params = new URLSearchParams({
        hours: hours.toString(),
        sensitivity: sensitivity.toString()
    });
    return fetchAnomaliesInternal(params);
}
