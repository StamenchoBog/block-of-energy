import { useState, useCallback } from 'react';
import { fetchForecast, fetchAnomalies } from '../lib/apiService';

/**
 * Custom hook for fetching prediction data (forecasts and anomalies)
 * Now with granular error state tracking (training vs unavailable vs error)
 */
export function usePredictions() {
    const [forecast, setForecast] = useState(null);
    const [anomalies, setAnomalies] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [serviceAvailable, setServiceAvailable] = useState(true);
    const [isTraining, setIsTraining] = useState(false);

    /**
     * Determines the combined service state from forecast and anomaly results.
     * Priority: data available > training > other errors
     *
     * @param {Object} forecastResult - { data, error?: { type, message } }
     * @param {Object} anomaliesResult - { data, error?: { type, message } }
     * @returns {{ isTraining: boolean, serviceAvailable: boolean, errorMessage: string | null }}
     */
    const determineServiceState = (forecastResult, anomaliesResult) => {
        const hasData = forecastResult.data !== null || anomaliesResult.data !== null;
        const forecastTraining = forecastResult.error?.type === 'training';
        const anomaliesTraining = anomaliesResult.error?.type === 'training';
        const anyTraining = forecastTraining || anomaliesTraining;

        // If we have any data, service is available (partial success is still success)
        if (hasData) {
            return {
                isTraining: anyTraining,
                serviceAvailable: true,
                errorMessage: null
            };
        }

        // No data available - check if it's due to training
        if (anyTraining) {
            return {
                isTraining: true,
                serviceAvailable: false,
                errorMessage: null
            };
        }

        // Both failed with non-training errors
        const errorMessage = forecastResult.error?.message ||
            anomaliesResult.error?.message ||
            'Prediction service unavailable';

        return {
            isTraining: false,
            serviceAvailable: false,
            errorMessage
        };
    };

    const fetchForecastData = useCallback(async (hours = 24) => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchForecast(hours);
            if (result.data) {
                setForecast(result.data);
                setServiceAvailable(true);
                setIsTraining(false);
            } else if (result.error) {
                setIsTraining(result.error.type === 'training');
                setServiceAvailable(false);
                if (result.error.type !== 'training') {
                    setError(result.error.message);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch forecast');
            console.error('Forecast fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAnomaliesData = useCallback(async (hours = 24, sensitivity = 0.8) => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchAnomalies(hours, sensitivity);
            if (result.data) {
                setAnomalies(result.data);
                setServiceAvailable(true);
                setIsTraining(false);
            } else if (result.error) {
                setIsTraining(result.error.type === 'training');
                setServiceAvailable(false);
                if (result.error.type !== 'training') {
                    setError(result.error.message);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch anomalies');
            console.error('Anomalies fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllPredictions = useCallback(async (hours = 24, sensitivity = 0.8) => {
        setLoading(true);
        setError(null);

        try {
            const [forecastResult, anomaliesResult] = await Promise.all([
                fetchForecast(hours),
                fetchAnomalies(hours, sensitivity)
            ]);

            if (forecastResult.data) {
                setForecast(forecastResult.data);
            }
            if (anomaliesResult.data) {
                setAnomalies(anomaliesResult.data);
            }

            // Determine combined service state
            const state = determineServiceState(forecastResult, anomaliesResult);
            setIsTraining(state.isTraining);
            setServiceAvailable(state.serviceAvailable);
            if (state.errorMessage) {
                setError(state.errorMessage);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch predictions');
            console.error('Predictions fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearPredictions = useCallback(() => {
        setForecast(null);
        setAnomalies(null);
        setError(null);
        setIsTraining(false);
    }, []);

    return {
        forecast,
        anomalies,
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