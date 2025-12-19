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

export type PredictionErrorType = 'training' | 'unavailable' | 'timeout' | 'error';

export interface PredictionError {
    type: PredictionErrorType;
    message: string;
}

export interface PredictionResult<T> {
    data: T | null;
    error?: PredictionError;
}

interface DashboardData {
    power?: { value: string; processingTimestamp?: string };
    voltage?: { value: string };
    current?: { value: string };
    energyToday?: { value: string };
    powerFactor?: { value: string };
    apparentPower?: { value: string };
    reactivePower?: { value: string };
    energyTotal?: { value: string };
    hourlyPowerData?: Array<{ timestamp: string; power: number }>;
}

// Default fallback data structure
const getDefaultDashboardData = (): DashboardData => ({
    power: { value: '0', processingTimestamp: new Date().toISOString() },
    voltage: { value: '0' },
    current: { value: '0' },
    energyToday: { value: '0' },
    powerFactor: { value: '0' },
    apparentPower: { value: '0' },
    reactivePower: { value: '0' },
    energyTotal: { value: '0' },
    hourlyPowerData: []
});

/**
 * Fetches dashboard data for charts and statistics with proper error handling
 */
export async function fetchDashboardData(): Promise<DashboardData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${API_URL}/api/dashboard_overview_data`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn(`Dashboard API returned ${response.status}, falling back to report data`);
            
            // Fallback to report data but with better error handling
            const fallbackData = await fetchReportData({
                type: 'daily',
                date: new Date().toISOString().split('T')[0]
            });
            
            // Transform report data to dashboard format if needed
            return fallbackData || getDefaultDashboardData();
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
            logger.warn('Invalid dashboard data structure received');
            return getDefaultDashboardData();
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            logger.error('Dashboard API request timed out', error);
        } else {
            logger.error('Error fetching dashboard data:', error);
        }
        
        return getDefaultDashboardData();
    }
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
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
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

/**
 * Fetches forecast predictions from the prediction service
 * Returns a result object with data and error info for better error handling
 */
export async function fetchForecast(hours: number = 24): Promise<PredictionResult<ForecastResponse>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_URL}/api/predictions/forecast?hours=${hours}`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

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
                logger.warn('Model is training');
                return {
                    data: null,
                    error: { type: 'training', message: errorMessage }
                };
            }

            if (response.status === 503 || response.status === 502) {
                logger.warn('Prediction service unavailable');
                return {
                    data: null,
                    error: { type: 'unavailable', message: errorMessage }
                };
            }

            return {
                data: null,
                error: { type: 'error', message: `API error: ${response.status}` }
            };
        }

        return { data: await response.json() };
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
            logger.error('Forecast API request timed out', error);
            return {
                data: null,
                error: { type: 'timeout', message: 'Request timed out' }
            };
        }
        logger.error('Error fetching forecast data:', error);
        return {
            data: null,
            error: { type: 'error', message: (error as Error).message }
        };
    }
}

/**
 * Fetches anomaly detection results from the prediction service
 * Returns a result object with data and error info for better error handling
 */
export async function fetchAnomalies(hours: number = 24, sensitivity: number = 0.8): Promise<PredictionResult<AnomalyResponse>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(
            `${API_URL}/api/predictions/anomalies?hours=${hours}&sensitivity=${sensitivity}`,
            {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        );

        clearTimeout(timeoutId);

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
                logger.warn('Anomaly detector is training');
                return {
                    data: null,
                    error: { type: 'training', message: errorMessage }
                };
            }

            if (response.status === 503 || response.status === 502) {
                logger.warn('Prediction service unavailable');
                return {
                    data: null,
                    error: { type: 'unavailable', message: errorMessage }
                };
            }

            return {
                data: null,
                error: { type: 'error', message: `API error: ${response.status}` }
            };
        }

        return { data: await response.json() };
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
            logger.error('Anomalies API request timed out', error);
            return {
                data: null,
                error: { type: 'timeout', message: 'Request timed out' }
            };
        }
        logger.error('Error fetching anomalies data:', error);
        return {
            data: null,
            error: { type: 'error', message: (error as Error).message }
        };
    }
}
