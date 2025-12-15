import { useState, useCallback } from 'react';
import { fetchReportData } from '../lib/apiService';

/**
 * Transform report data to chart-compatible format
 * @param {Array} data - Raw report data from API
 * @param {string} type - Report type (daily|weekly|monthly)
 * @param {string} dateParam - The date parameter used for the request
 * @returns {Array} Chart-compatible data with { timestamp, power }
 */
function transformReportToChartData(data, type, dateParam) {
    if (!Array.isArray(data) || data.length === 0) return [];

    const baseDate = dateParam ? new Date(dateParam) : new Date();

    return data.map(item => {
        let timestamp;

        switch (type) {
            case 'daily':
                // hour is 0-23, create timestamp for the selected date at that hour
                timestamp = new Date(baseDate);
                timestamp.setHours(item.hour || 0, 0, 0, 0);
                break;
            case 'weekly':
            case 'monthly':
                // date is YYYY-MM-DD string
                timestamp = item.date ? new Date(item.date + 'T12:00:00') : new Date();
                break;
            default:
                timestamp = new Date();
        }

        return {
            timestamp: timestamp.toISOString(),
            power: item.peakPower || item.power || 0
        };
    });
}

/**
 * Calculate ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Hook for fetching report data with time range support
 * @param {string} apiUrl - Optional API base URL
 * @returns {Object} { data, loading, error, activeRange, fetchData }
 */
export function useReportData(apiUrl = '') {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeRange, setActiveRange] = useState('day');

    const fetchData = useCallback(async (range) => {
        setLoading(true);
        setError(null);

        try {
            // Map UI range to API type
            const typeMap = { day: 'daily', week: 'weekly', month: 'monthly' };
            const params = { type: typeMap[range] || 'daily' };

            // Build date parameters based on range
            const now = new Date();

            if (range === 'day') {
                params.date = now.toISOString().split('T')[0];
            } else if (range === 'week') {
                params.week = getWeekNumber(now).toString();
                params.year = now.getFullYear().toString();
            } else if (range === 'month') {
                params.month = (now.getMonth() + 1).toString();
                params.year = now.getFullYear().toString();
            }

            const response = await fetchReportData(params);

            if (response) {
                const reportData = response.data || response;
                if (Array.isArray(reportData)) {
                    const chartData = transformReportToChartData(reportData, params.type, params.date);
                    setData(chartData);
                } else {
                    setData([]);
                }
            } else {
                setData([]);
            }

            setActiveRange(range);
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, activeRange, fetchData };
}