import { useMemo } from 'react';
import { format, isValid, isDate, parseISO } from 'date-fns';

export const toDate = (value) => isDate(value) ? value : parseISO(value);

export const parseUTC = (timestamp) => {
    if (!timestamp) return new Date(NaN);
    const ts = String(timestamp);
    return new Date(ts.endsWith('Z') ? ts : ts + 'Z');
};

export const formatChartDate = (timestamp) => {
    const date = new Date(timestamp);
    if (!isValid(date)) return 'Invalid';
    return format(date, 'MMM d');
};

export const formatChartTime = (timestamp) => {
    const date = new Date(timestamp);
    if (!isValid(date)) return 'Invalid';
    return format(date, 'HH:mm');
};

export const formatAnomalyTime = (timestamp) => {
    const date = new Date(timestamp);
    if (!isValid(date)) return 'Invalid';
    return format(date, 'MMM d, HH:mm');
};

export const formatUTCToLocalTime = (timestamp) => {
    const date = parseUTC(timestamp);
    if (!isValid(date)) return '--:--';
    return format(date, 'HH:mm');
};

export const formatUTCToLocalDate = (timestamp) => {
    const date = parseUTC(timestamp);
    if (!isValid(date)) return 'Invalid';
    return format(date, 'MMM d');
};

export const useFormatters = () => {
    return useMemo(() => ({
        toDate,
        parseUTC,
        formatChartDate,
        formatChartTime,
        formatAnomalyTime,
        formatUTCToLocalTime,
        formatUTCToLocalDate,
    }), []);
};