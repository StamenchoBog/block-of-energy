import { memo } from 'react';

// Helper function to format large numbers
const formatValue = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};

// Main MetricCard component - preserves original design
const MetricCard = memo(({ 
    title, 
    subtitle, 
    value, 
    unit, 
    icon: customIcon,
    colorClass, 
    large = false,
    trend,
    trendValue,
    description,
    loading = false,
    className = ''
}) => {
    // Handle loading state
    if (loading) {
        return (
            <div className={`metric-card ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    {description && <div className="h-3 bg-gray-200 rounded w-1/3"></div>}
                </div>
            </div>
        );
    }

    // Use custom icon if provided
    const icon = customIcon;
    
    // Format the value for display
    const formattedValue = formatValue(value);

    return (
        <div className={`metric-card group ${className} ${large ? 'col-span-1 md:col-span-2 lg:col-span-1' : ''}`}>
            {/* Header with icon */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {icon && (
                    <div className={`w-10 h-10 ${colorClass?.bg || 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                        {icon}
                    </div>
                )}
            </div>

            {/* Value and unit */}
            <div className="flex items-baseline justify-between">
                <div className="flex items-baseline space-x-2">
                    <span className={`${large ? 'text-4xl' : 'text-3xl'} font-bold ${colorClass?.text || 'text-gray-600'}`}>
                        {formattedValue}
                    </span>
                    {unit && (
                        <span className="text-lg font-medium text-gray-500">
                            {unit}
                        </span>
                    )}
                </div>
                
                {/* Trend indicator */}
                {trend && trendValue && (
                    <div className={`flex items-center space-x-1 text-sm font-medium ${
                        trend === 'up' ? 'text-green-600' :
                        trend === 'down' ? 'text-red-600' :
                        'text-gray-500'
                    }`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            {trend === 'up' && (
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                            )}
                            {trend === 'down' && (
                                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            )}
                            {trend === 'stable' && (
                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                            )}
                        </svg>
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Description */}
            {description && (
                <p className="mt-3 text-sm text-gray-600">
                    {description}
                </p>
            )}

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
    );
});

MetricCard.displayName = 'MetricCard';

// SecondaryMetric - preserved from original
const SecondaryMetric = memo(({ title, value, unit, className = '' }) => (
    <div className={`metric-card ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {title}
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {unit}
            </span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
));

SecondaryMetric.displayName = 'SecondaryMetric';

export default MetricCard;
export { SecondaryMetric };