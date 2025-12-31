import { useCallback, useMemo } from 'react';
import { usePredictionOperation } from './useAsyncOperation';
import { fetchForecast, fetchAnomalies } from '../lib/apiService';

/**
 * Custom hook for fetching prediction data (forecasts and anomalies).
 * Uses usePredictionOperation for consistent async state management.
 */
export function usePredictions() {
    // Separate state machines for forecast and anomalies
    const forecastOp = usePredictionOperation();
    const anomaliesOp = usePredictionOperation();

    // Extract stable function references to avoid infinite re-render loops
    const { executePrediction: execForecast, resetPrediction: resetForecast } = forecastOp;
    const { executePrediction: execAnomalies, resetPrediction: resetAnomalies } = anomaliesOp;

    // Derive combined state from both operations
    const loading = forecastOp.loading || anomaliesOp.loading;
    const isTraining = forecastOp.isTraining || anomaliesOp.isTraining;

    // Service is available if either has data or is just training
    const serviceAvailable = useMemo(() => {
        const hasData = forecastOp.data !== null || anomaliesOp.data !== null;
        if (hasData) return true;
        // If both are unavailable (not just training), service is down
        return forecastOp.serviceAvailable || anomaliesOp.serviceAvailable || isTraining;
    }, [forecastOp.data, forecastOp.serviceAvailable, anomaliesOp.data, anomaliesOp.serviceAvailable, isTraining]);

    // Combine errors (prefer non-null)
    const error = forecastOp.error || anomaliesOp.error;

    const fetchForecastData = useCallback(async (hours = 24) => {
        await execForecast(() => fetchForecast(hours));
    }, [execForecast]);

    const fetchAnomaliesData = useCallback(async (hours = 24, sensitivity = 0.8) => {
        await execAnomalies(() => fetchAnomalies(hours, sensitivity));
    }, [execAnomalies]);

    const fetchAllPredictions = useCallback(async (hours = 24, sensitivity = 0.8) => {
        // Fetch both in parallel
        await Promise.all([
            execForecast(() => fetchForecast(hours)),
            execAnomalies(() => fetchAnomalies(hours, sensitivity))
        ]);
    }, [execForecast, execAnomalies]);

    const clearPredictions = useCallback(() => {
        resetForecast();
        resetAnomalies();
    }, [resetForecast, resetAnomalies]);

    return {
        forecast: forecastOp.data,
        anomalies: anomaliesOp.data,
        loading,
        error,
        serviceAvailable,
        isTraining,
        fetchForecastData,
        fetchAnomaliesData,
        fetchAllPredictions,
        clearPredictions
    };
}

export default usePredictions;