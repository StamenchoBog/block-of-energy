import { useState, useCallback } from 'react';
import { fetchReportData } from '../lib/apiService';
import { format, getISOWeek, startOfISOWeek, setISOWeek, setYear } from 'date-fns';

/**
 * Format a date as YYYY-MM-DD using local time (not UTC)
 * Uses date-fns format function
 */
function formatLocalDate(date) {
    return format(date, 'yyyy-MM-dd');
}

/**
 * Get the Monday of a given ISO week number
 * @param {number} week - ISO week number (1-53)
 * @param {number} year - Year
 * @returns {Date} The Monday of that week
 */
function getWeekStart(week, year) {
    // Create a date in the target year, set the ISO week, then get the start of that week
    const date = setYear(setISOWeek(new Date(), week), year);
    return startOfISOWeek(date);
}

/**
 * Fill gaps in report data with null values
 * Creates a complete time series with null for missing data points
 *
 * @param {Array} data - Sparse data array with { timestamp, power } objects
 * @param {string} type - Report type: 'daily' | 'weekly' | 'monthly'
 * @param {Object} rangeInfo - Contains baseDate, week, month, year
 * @returns {Array} Complete array with all expected time slots, nulls for missing
 */
function fillDataGaps(data, type, rangeInfo) {
    if (!data || data.length === 0) return data;

    // Build a Map for O(1) lookup of existing data
    // Use formatLocalDate to avoid timezone issues with toISOString()
    const dataMap = new Map();
    data.forEach(item => {
        const date = new Date(item.timestamp);
        let key;

        if (type === 'daily') {
            key = date.getHours();
        } else {
            // For weekly/monthly, use local YYYY-MM-DD as key
            key = formatLocalDate(date);
        }
        dataMap.set(key, item);
    });

    const result = [];

    if (type === 'daily') {
        // Generate all 24 hours
        const baseDate = rangeInfo.baseDate || new Date();
        for (let hour = 0; hour < 24; hour++) {
            const existing = dataMap.get(hour);
            if (existing) {
                result.push(existing);
            } else {
                const timestamp = new Date(baseDate);
                timestamp.setHours(hour, 0, 0, 0);
                result.push({
                    timestamp: timestamp.toISOString(),
                    power: null
                });
            }
        }
    } else if (type === 'weekly') {
        // Generate 7 days starting from Monday of the week
        const weekStart = getWeekStart(rangeInfo.week, rangeInfo.year);

        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + day);
            currentDate.setHours(12, 0, 0, 0);
            const dateKey = formatLocalDate(currentDate);

            const existing = dataMap.get(dateKey);
            if (existing) {
                result.push(existing);
            } else {
                result.push({
                    timestamp: currentDate.toISOString(),
                    power: null
                });
            }
        }
    } else if (type === 'monthly') {
        // Generate all days in the month
        const year = rangeInfo.year;
        const month = rangeInfo.month - 1; // JS months are 0-indexed
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day, 12, 0, 0);
            const dateKey = formatLocalDate(currentDate);

            const existing = dataMap.get(dateKey);
            if (existing) {
                result.push(existing);
            } else {
                result.push({
                    timestamp: currentDate.toISOString(),
                    power: null
                });
            }
        }
    } else {
        // Unknown type, return original data
        return data;
    }

    return result;
}

/**
 * Transform report data to chart-compatible format
 * @param {Array} data - Raw report data from API
 * @param {string} type - Report type (daily|weekly|monthly)
 * @param {string} dateParam - The date parameter used for the request
 * @param {Object} rangeInfo - Additional range info (week, month, year)
 * @returns {Array} Chart-compatible data with { timestamp, power }
 */
function transformReportToChartData(data, type, dateParam, rangeInfo = {}) {
    if (!Array.isArray(data) || data.length === 0) return [];

    const baseDate = dateParam ? new Date(dateParam) : new Date();

    const sparseData = data.map(item => {
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

    // Fill gaps with null values for missing time slots
    return fillDataGaps(sparseData, type, { ...rangeInfo, baseDate });
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
                params.date = format(now, 'yyyy-MM-dd');
            } else if (range === 'week') {
                params.week = getISOWeek(now).toString();
                params.year = now.getFullYear().toString();
            } else if (range === 'month') {
                params.month = (now.getMonth() + 1).toString();
                params.year = now.getFullYear().toString();
            }

            const response = await fetchReportData(params);

            if (response) {
                const reportData = response.data || response;
                if (Array.isArray(reportData)) {
                    const rangeInfo = {
                        week: params.week ? parseInt(params.week) : undefined,
                        month: params.month ? parseInt(params.month) : undefined,
                        year: params.year ? parseInt(params.year) : now.getFullYear()
                    };
                    const chartData = transformReportToChartData(reportData, params.type, params.date, rangeInfo);
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