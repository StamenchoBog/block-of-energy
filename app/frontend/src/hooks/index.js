import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching dashboard data client-side
 * This ensures data is fetched at runtime, not build time
 */
export function useDashboardData(apiUrl = '', refreshInterval = 300000) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const baseUrl = apiUrl || '';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${baseUrl}/api/dashboard_overview_data`, {
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            setError(null);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err.message);
                console.error('Dashboard fetch error:', err);
            }
        } finally {
            setLoading(false);
        }
    }, [baseUrl]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        fetchData();

        // Set up auto-refresh
        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchData, refreshInterval]);

    return { data, loading, error, refetch: fetchData };
}

export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(initialValue);

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}

export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Re-export other hooks
export { useReportData } from './useReportData';
export { usePredictions } from './usePredictions';
export { useFormatters, getStatusColor, formatValue, formatDateTime } from './useFormatters';



