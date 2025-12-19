import { useMemo } from 'react';

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

        // Format timestamps with various options
        formatDateTime: (timestamp, options = {}) => {
            const {
                format = 'short',
                includeTime = true,
                includeDate = true,
                locale = 'en-US'
            } = options;

            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Invalid Date';

            let formatOptions = {};
            
            if (includeDate) {
                switch (format) {
                    case 'full':
                        formatOptions.year = 'numeric';
                        formatOptions.month = 'long';
                        formatOptions.day = 'numeric';
                        break;
                    case 'medium':
                        formatOptions.year = 'numeric';
                        formatOptions.month = 'short';
                        formatOptions.day = 'numeric';
                        break;
                    case 'short':
                        formatOptions.month = 'short';
                        formatOptions.day = 'numeric';
                        break;
                    case 'time':
                        // Time only format
                        break;
                    default:
                        formatOptions.month = 'short';
                        formatOptions.day = 'numeric';
                }
            }

            if (includeTime && format !== 'date') {
                formatOptions.hour = '2-digit';
                formatOptions.minute = '2-digit';
                if (format === 'full' || format === 'medium') {
                    formatOptions.second = '2-digit';
                }
            }

            return date.toLocaleString(locale, formatOptions);
        },

        // Format time from timestamp (hours:minutes)
        formatTime: (timestamp) => {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '--:--';
            
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

        // Format relative time (e.g., "2 hours ago")
        formatRelativeTime: (timestamp, locale = 'en-US') => {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            return date.toLocaleDateString(locale);
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

// Export a simplified version for components that don't need the full hook
export const formatValue = (value, options = {}) => {
    const formatters = useFormatters();
    return formatters.formatValue(value, options);
};

export const formatDateTime = (timestamp, options = {}) => {
    const formatters = useFormatters();
    return formatters.formatDateTime(timestamp, options);
};