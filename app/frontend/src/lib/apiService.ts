const API_URL = import.meta.env.PUBLIC_API_URL;

const logger = {
    error: (message: string, error: unknown) => {
        console.error(`[API Error] ${message}`, error);
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

/**
 * Fetches dashboard data for charts and statistics
 */
export async function fetchDashboardData() {
    try {
        // Try the dashboard-specific endpoint first
        const response = await fetch(`${API_URL}/api/dashboard_overview_data`);

        if (!response.ok) {
            // Fallback to using the report data with default parameters
            // This ensures backward compatibility if the dashboard endpoint was removed
            return fetchReportData({
                type: 'daily',
                date: new Date().toISOString().split('T')[0]
            });
        }

        const data = await response.json();
        return data;
    } catch (error) {
        logger.error('Error fetching dashboard data:', error);
        // Return empty array instead of null for better component handling
        return [];
    }
}

/**
 * Fetches report data based on provided parameters
 */
export async function fetchReportData(params: ReportParams) {
    try {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) queryParams.set(key, value);
        });

        const response = await fetch(`${API_URL}/api/report?${queryParams.toString()}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        // Return the complete response object
        return await response.json();
    } catch (error) {
        console.error('Error fetching report data:', error);
        return null;
    }
}
