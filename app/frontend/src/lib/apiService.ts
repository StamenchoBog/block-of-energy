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
