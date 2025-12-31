import { useState, useCallback } from 'react';
import { fetchReportData } from '../lib/apiService';
import {
    format,
    getISOWeek,
    startOfISOWeek,
    endOfISOWeek,
    startOfMonth,
    endOfMonth,
    eachHourOfInterval,
    eachDayOfInterval,
    setHours,
    parseISO,
    setISOWeek,
    setISOWeekYear
} from 'date-fns';

/**
 * Generate full time range for a report type
 */
function generateTimeRange(type, params) {
    const now = new Date();

    if (type === 'daily') {
        const baseDate = params.date ? parseISO(params.date) : now;
        return eachHourOfInterval({
            start: setHours(baseDate, 0),
            end: setHours(baseDate, 23)
        });
    }

    if (type === 'weekly') {
        const dateInWeek = setISOWeek(setISOWeekYear(new Date(), params.year), params.week);
        return eachDayOfInterval({
            start: startOfISOWeek(dateInWeek),
            end: endOfISOWeek(dateInWeek)
        });
    }

    if (type === 'monthly') {
        const monthDate = new Date(params.year, params.month - 1, 1);
        return eachDayOfInterval({
            start: startOfMonth(monthDate),
            end: endOfMonth(monthDate)
        });
    }

    return [];
}

/**
 * Transform API data and fill full range with nulls for gaps
 */
function transformToChartData(apiData, type, params) {
    // Build lookup from API data
    const dataMap = new Map();
    (apiData || []).forEach(item => {
        const key = type === 'daily' ? item.hour : item.date;
        dataMap.set(key, item.peakPower ?? item.power ?? 0);
    });

    // Generate full range with data or null
    return generateTimeRange(type, params).map(date => {
        const key = type === 'daily'
            ? date.getHours()
            : format(date, 'yyyy-MM-dd');

        return {
            timestamp: date.toISOString(),
            power: dataMap.has(key) ? dataMap.get(key) : null
        };
    });
}

/**
 * Hook for fetching report data with time range support.
 */
export function useReportData() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeRange, setActiveRange] = useState('day');

    const fetchData = useCallback(async (range) => {
        setLoading(true);
        setError(null);

        try {
            const typeMap = { day: 'daily', week: 'weekly', month: 'monthly' };
            const type = typeMap[range] || 'daily';
            const now = new Date();

            const params = { type };
            if (range === 'day') {
                params.date = format(now, 'yyyy-MM-dd');
            } else if (range === 'week') {
                params.week = getISOWeek(now);
                params.year = now.getFullYear();
            } else if (range === 'month') {
                params.month = now.getMonth() + 1;
                params.year = now.getFullYear();
            }

            const response = await fetchReportData(params);
            const apiData = response?.data || response || [];

            setData(transformToChartData(Array.isArray(apiData) ? apiData : [], type, params));
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