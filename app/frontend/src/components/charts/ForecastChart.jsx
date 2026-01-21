import { Line } from 'react-chartjs-2';
import { memo, useMemo } from 'react';
import { startOfHour } from 'date-fns';
import { getBaseChartOptions, CHART_COLORS } from './BaseChart';
import { parseUTC, formatUTCToLocalTime, formatUTCToLocalDate } from '../../hooks/useFormatters';

// Chart.js registration is handled by BaseChart.jsx

/** Find index where forecast starts (current hour) */
const findNowIndex = (data) => {
    const currentHour = startOfHour(new Date());
    return data.findIndex(item => parseUTC(item.timestamp) >= currentHour);
};

/** Split array into past/future at index, with one overlapping point for line continuity */
const splitAtIndex = (data, index, accessor) => ({
    past: data.map((item, i) => i <= index ? accessor(item) : null),  // Include nowIndex for overlap
    future: data.map((item, i) => i >= index ? accessor(item) : null)
});

/** Create dataset config */
const createDataset = (label, data, color, options = {}) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: options.fill ? color.replace('1)', '0.1)') : 'transparent',
    fill: options.fill || false,
    tension: options.tension || 0.3,
    borderWidth: options.borderWidth || 2,
    borderDash: options.dashed ? [8, 6] : undefined,
    pointRadius: options.pointRadius || 0,
    order: options.order || 1,
    spanGaps: true
});

const ForecastChart = memo(({ predictions = [], modelInfo = null, loading = false }) => {
    const chartData = useMemo(() => {
        if (!predictions?.length) return null;

        const sorted = [...predictions].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        const nowIndex = findNowIndex(sorted);
        const labels = sorted.map(item => formatUTCToLocalTime(item.timestamp));

        // Split data at nowIndex
        const power = splitAtIndex(sorted, nowIndex, d => d.predicted_power);
        const upper = splitAtIndex(sorted, nowIndex, d => d.upper_bound);
        const lower = splitAtIndex(sorted, nowIndex, d => d.lower_bound);

        return {
            labels,
            nowIndex,
            datasets: [
                // Hindcast (past) - dashed
                createDataset('Hindcast (W)', power.past, 'rgba(147, 51, 234, 0.6)', {
                    dashed: true, tension: 0.1
                }),
                // Forecast (future) - solid
                createDataset('Forecast (W)', power.future, CHART_COLORS.purple.border, {
                    borderWidth: 3
                }),
                // Confidence bands
                { ...createDataset('Upper', upper.future, 'transparent', { fill: '+1', order: 10 }),
                  backgroundColor: 'rgba(147, 51, 234, 0.1)' },
                { ...createDataset('Lower', lower.future, 'transparent', { order: 11 }),
                  backgroundColor: 'rgba(147, 51, 234, 0.1)' }
            ]
        };
    }, [predictions]);

    const nowIndex = chartData?.nowIndex ?? 0;

    const chartOptions = useMemo(() => getBaseChartOptions({
        tooltipBorderColor: CHART_COLORS.purple.border,
        maxXTicks: 24, // Show more hour labels
        plugins: {
            tooltip: {
                callbacks: {
                    title: (ctx) => ctx[0]?.label ? `Time: ${ctx[0].label}` : '',
                    label: (ctx) => {
                        if (ctx.parsed.y === null) return null;
                        const prefix = ctx.dataset.label.includes('Hindcast') ? 'Hindcast' :
                                      ctx.dataset.label.includes('Forecast') ? 'Forecast' : ctx.dataset.label;
                        return `${prefix}: ${ctx.parsed.y.toLocaleString()} W`;
                    },
                    filter: (item) => item.raw !== null
                }
            },
            annotation: nowIndex > 0 ? {
                annotations: {
                    nowLine: {
                        type: 'line',
                        xMin: nowIndex,
                        xMax: nowIndex,
                        borderColor: 'rgba(100, 116, 139, 0.7)',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        label: {
                            display: true,
                            content: 'Now',
                            position: 'start',
                            backgroundColor: 'rgba(100, 116, 139, 0.85)',
                            color: 'white',
                            font: { size: 10, weight: '500' },
                            padding: { x: 5, y: 2 },
                            borderRadius: 3
                        }
                    }
                }
            } : {}
        }
    }), [nowIndex]);

    // Loading state
    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-80 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    // Empty state
    if (!chartData) {
        return (
            <div className="h-80 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Forecast Available</h4>
                <p className="text-sm text-gray-500 text-center max-w-md">
                    Forecast predictions will appear here once the model is trained and ready.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Model Info */}
            {modelInfo && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {modelInfo.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            Accuracy: {((1 - modelInfo.accuracy_mape) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">
                        Trained: {formatUTCToLocalDate(modelInfo.last_trained)}
                    </span>
                </div>
            )}

            {/* Chart */}
            <div className="h-80 relative">
                <Line data={chartData} options={chartOptions} />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center">
                    <div className="w-6 h-0.5 bg-purple-500 mr-2"></div>
                    <span className="text-gray-600">Forecast</span>
                </div>
                <div className="flex items-center">
                    <div className="w-6 h-0.5 border-t-2 border-dashed border-purple-400 mr-2"></div>
                    <span className="text-gray-600">Hindcast</span>
                </div>
                <div className="flex items-center">
                    <div className="w-6 h-3 rounded bg-purple-100 mr-2"></div>
                    <span className="text-gray-600">Confidence</span>
                </div>
            </div>
        </div>
    );
});

ForecastChart.displayName = 'ForecastChart';

export default ForecastChart;
