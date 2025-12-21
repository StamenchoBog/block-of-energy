import { useMemo } from 'react';
import { format, isValid, formatDistanceToNow } from 'date-fns';

// Centralized formatters hook
export const useFormatters = () => {
    return useMemo(() => ({
        // Format numeric values with appropriate units
        formatValue: (value, options = {}) => {
            const {
                decimals = 0,
                prefix = '',
                suffix = '',
                showLargeNumbers = true
            } = options;

            if (value === undefined || value === null) return "—";

            let num = parseFloat(value);
            if (isNaN(num)) return value;

            // Format large numbers
            if (showLargeNumbers) {
                if (num >= 1000000) {
                    return `${prefix}${(num / 1000000).toFixed(decimals)}M${suffix}`;
                } else if (num >= 1000) {
                    return `${prefix}${(num / 1000).toFixed(decimals)}K${suffix}`;
                }
            }

            const formattedValue = decimals > 0 ? num.toFixed(decimals) :
                                 Number.isInteger(num) ? num : num.toFixed(2);

            return `${prefix}${formattedValue.toLocaleString()}${suffix}`;
        },

        // Format large numbers for display
        formatLargeNumber: (val, decimals = 1) => {
            const num = parseFloat(val);
            if (isNaN(num)) return val;

            if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
            if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
            return num.toLocaleString();
        },

        // Format timestamps with various options using date-fns
        formatDateTime: (timestamp, options = {}) => {
            const {
                formatType = 'short',
                includeTime = true,
                includeDate = true
            } = options;

            const date = new Date(timestamp);
            if (!isValid(date)) return 'Invalid Date';

            // Build format string based on options
            let formatStr = '';

            if (includeDate) {
                switch (formatType) {
                    case 'full':
                        formatStr = 'MMMM d, yyyy';
                        break;
                    case 'medium':
                        formatStr = 'MMM d, yyyy';
                        break;
                    case 'short':
                    default:
                        formatStr = 'MMM d';
                        break;
                }
            }

            if (includeTime && formatType !== 'date') {
                const timeFormat = (formatType === 'full' || formatType === 'medium')
                    ? 'HH:mm:ss'
                    : 'HH:mm';
                formatStr = formatStr ? `${formatStr}, ${timeFormat}` : timeFormat;
            }

            return format(date, formatStr);
        },

        // Format time from timestamp (hours:minutes)
        formatTime: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return '--:--';
            return format(date, 'HH:mm');
        },

        // Format date for chart labels (e.g., "Jan 15")
        formatChartDate: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return 'Invalid';
            return format(date, 'MMM d');
        },

        // Format time for chart labels (e.g., "14:30")
        formatChartTime: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return 'Invalid';
            return format(date, 'HH:mm');
        },

        // Format for anomaly timestamps (e.g., "Dec 21, 14:30")
        formatAnomalyTime: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return 'Invalid';
            return format(date, 'MMM d, HH:mm');
        },

        // Format for last updated display (e.g., "14:30:45")
        formatLastUpdated: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return 'N/A';
            return format(date, 'HH:mm:ss');
        },

        // Format duration in milliseconds to human readable
        formatDuration: (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}d ${hours % 24}h`;
            if (hours > 0) return `${hours}h ${minutes % 60}m`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        },

        // Format percentage with appropriate decimals
        formatPercentage: (value, decimals = 1) => {
            const num = parseFloat(value);
            if (isNaN(num)) return '0%';
            return `${num.toFixed(decimals)}%`;
        },

        // Format energy values with appropriate units
        formatEnergy: (value, unit = 'kWh') => {
            const num = parseFloat(value);
            if (isNaN(num)) return `0 ${unit}`;

            if (num >= 1000 && unit === 'kWh') {
                return `${(num / 1000).toFixed(2)} MWh`;
            }
            return `${Number.isInteger(num) ? num : num.toFixed(2)} ${unit}`;
        },

        // Format power values with appropriate units
        formatPower: (value, unit = 'W') => {
            const num = parseFloat(value);
            if (isNaN(num)) return `0 ${unit}`;

            if (num >= 1000 && unit === 'W') {
                return `${(num / 1000).toFixed(2)} kW`;
            }
            return `${Number.isInteger(num) ? num : num.toFixed(2)} ${unit}`;
        },

        // Format voltage values
        formatVoltage: (value) => {
            const num = parseFloat(value);
            if (isNaN(num)) return '0 V';
            return `${Number.isInteger(num) ? num : num.toFixed(1)} V`;
        },

        // Format currency values
        formatCurrency: (value, currency = 'USD', locale = 'en-US') => {
            const num = parseFloat(value);
            if (isNaN(num)) return '$0';

            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency
            }).format(num);
        },

        // Format file size
        formatFileSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        },

        // Format relative time (e.g., "2 hours ago") using date-fns
        formatRelativeTime: (timestamp) => {
            const date = new Date(timestamp);
            if (!isValid(date)) return 'Invalid Date';
            return formatDistanceToNow(date, { addSuffix: true });
        }
    }), []);
};

// Utility function for status colors (moved from MetricCard)
export const getStatusColor = (title, value) => {
    const val = parseFloat(value);
    
    switch (title.toLowerCase()) {
        case 'power':
            return val > 800 ? 'text-red-600' : 
                   val > 400 ? 'text-yellow-600' : 
                   'text-green-600';
        case 'voltage':
            return val < 220 || val > 240 ? 'text-red-600' : 'text-green-600';
        case 'power factor':
            return val < 0.8 ? 'text-red-600' : 
                   val < 0.9 ? 'text-yellow-600' : 
                   'text-green-600';
        default:
            return 'text-gray-900';
    }
};

// Standalone formatters for use outside React components
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

export const formatLastUpdated = (timestamp) => {
    const date = new Date(timestamp);
    if (!isValid(date)) return 'N/A';
    return format(date, 'HH:mm:ss');
};
