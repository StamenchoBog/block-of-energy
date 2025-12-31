import { memo } from 'react';

const formatValue = (value, decimals = 1) => {
    if (value === null || value === undefined) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    if (num >= 1000) {
        return (num / 1000).toFixed(decimals) + 'k';
    }
    return num.toFixed(decimals);
};

const TrendBadge = memo(({ value, label }) => {
    if (value === null || value === undefined) return null;

    const isPositive = value > 0;
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // For energy: positive = more consumption = generally "bad" (red)
    // For efficiency metrics it might be reversed, but for energy reports higher = more cost
    const colorClass = isPositive
        ? 'text-red-600 bg-red-50'
        : isNegative
            ? 'text-green-600 bg-green-50'
            : 'text-gray-600 bg-gray-50';

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {isPositive && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                </svg>
            )}
            {isNegative && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
            )}
            <span>{absValue.toFixed(1)}%</span>
            {label && <span className="text-gray-500 font-normal">{label}</span>}
        </div>
    );
});

TrendBadge.displayName = 'TrendBadge';

const SummaryCard = memo(({ title, value, unit, change, comparisonLabel, icon, colorClass, hasComparison }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{title}</span>
            {icon && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass || 'bg-gray-100'}`}>
                    {icon}
                </div>
            )}
        </div>
        <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            <span className="text-sm text-gray-500">{unit}</span>
        </div>
        {change !== undefined && change !== null ? (
            <TrendBadge value={change} label={comparisonLabel} />
        ) : hasComparison === false ? (
            <span className="text-xs text-gray-400">No previous data</span>
        ) : null}
    </div>
));

SummaryCard.displayName = 'SummaryCard';

const ReportSummaryCards = memo(({ summary }) => {
    if (!summary) return null;

    const { totalEnergy, peakPower, totalCost, currency, comparison } = summary;
    const comparisonLabel = comparison?.label;
    const hasComparison = comparison !== undefined && comparison !== null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Period Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Energy"
                    value={formatValue(totalEnergy)}
                    unit="kWh"
                    change={comparison?.changes?.energyChange}
                    comparisonLabel={comparisonLabel}
                    hasComparison={hasComparison}
                    colorClass="bg-blue-50"
                    icon={
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                />
                <SummaryCard
                    title="Total Cost"
                    value={formatValue(totalCost, 0)}
                    unit={currency || 'MKD'}
                    change={comparison?.changes?.costChange}
                    comparisonLabel={comparisonLabel}
                    hasComparison={hasComparison}
                    colorClass="bg-green-50"
                    icon={
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,17V16H9V14H13V13H10A1,1 0 0,1 9,12V9A1,1 0 0,1 10,8H11V7H13V8H15V10H11V11H14A1,1 0 0,1 15,12V15A1,1 0 0,1 14,16H13V17H11Z"/>
                        </svg>
                    }
                />
                <SummaryCard
                    title="Peak Power"
                    value={formatValue(peakPower)}
                    unit="W"
                    change={comparison?.changes?.peakPowerChange}
                    comparisonLabel={comparisonLabel}
                    hasComparison={hasComparison}
                    colorClass="bg-orange-50"
                    icon={
                        <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    }
                />
            </div>
        </div>
    );
});

ReportSummaryCards.displayName = 'ReportSummaryCards';

export default ReportSummaryCards;
