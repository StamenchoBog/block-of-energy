import { useState, useCallback } from 'react';

export function useAsyncOperation(options = {}) {
    const { initialData = null, onSuccess, onError } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (asyncFn) => {
        setLoading(true);
        setError(null);

        try {
            const result = await asyncFn();
            setData(result);
            onSuccess?.(result);
            return result;
        } catch (err) {
            const errorMessage = err.message || 'Operation failed';
            setError(errorMessage);
            onError?.(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [onSuccess, onError]);

    const reset = useCallback(() => {
        setData(initialData);
        setError(null);
        setLoading(false);
    }, [initialData]);

    return { data, setData, loading, error, setError, execute, reset };
}

/**
 * Extended hook for prediction-specific operations.
 * Handles training state and service availability tracking.
 *
 * @param {Object} options - Configuration options (same as useAsyncOperation)
 * @returns {Object} Extended state with serviceAvailable, isTraining, executePrediction
 */
export function usePredictionOperation(options = {}) {
    const base = useAsyncOperation(options);
    const [serviceAvailable, setServiceAvailable] = useState(true);
    const [isTraining, setIsTraining] = useState(false);

    // Extract stable function references to prevent infinite re-render loops
    const { execute, setError, reset } = base;

    const executePrediction = useCallback(async (asyncFn) => {
        setError(null);

        return execute(async () => {
            const result = await asyncFn();

            // Handle prediction API result structure: { data, error? }
            if (result?.data) {
                setServiceAvailable(true);
                setIsTraining(false);
                return result.data;
            }

            if (result?.error) {
                const isTrainingError = result.error.type === 'training';
                setIsTraining(isTrainingError);
                setServiceAvailable(false);

                if (!isTrainingError) {
                    throw new Error(result.error.message);
                }
            }

            return null;
        });
    }, [execute, setError]);

    const resetPrediction = useCallback(() => {
        reset();
        setServiceAvailable(true);
        setIsTraining(false);
    }, [reset]);

    return {
        ...base,
        serviceAvailable,
        setServiceAvailable,
        isTraining,
        setIsTraining,
        executePrediction,
        resetPrediction
    };
}

export default useAsyncOperation;
