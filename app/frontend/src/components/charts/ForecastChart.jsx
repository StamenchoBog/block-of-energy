import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { memo, useMemo } from 'react';
import { formatChartTime, formatChartDate } from '../../hooks/useFormatters';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ForecastChart = memo(({ predictions = [], modelInfo = null, loading = false, anomalies = [] }) => {
    const hasValidData = predictions && Array.isArray(predictions) && predictions.length > 0;

    const chartData = useMemo(() => {
        if (!hasValidData) return null;

        const sortedData = [...predictions].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Use centralized formatters for consistent time display
        const labels = sortedData.map(item => formatChartTime(item.timestamp));

        // Find anomaly timestamps for highlighting
        const anomalyTimestamps = new Set(anomalies.map(a => a.timestamp));

        return {
            labels,
            datasets: [
                // Upper bound (confidence interval top)
                {
                    label: 'Upper Bound',
                    data: sortedData.map(item => item.upper_bound),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    fill: '+1',
                    tension: 0.3,
                    pointRadius: 0,
                    order: 3
                },
                // Predicted power (main line)
                {
                    label: 'Predicted Power (W)',
                    data: sortedData.map(item => item.predicted_power),
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.05)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: sortedData.map((item) =>
                        anomalyTimestamps.has(item.timestamp) ? 8 : 0
                    ),
                    pointBackgroundColor: sortedData.map((item) =>
                        anomalyTimestamps.has(item.timestamp) ? 'rgba(239, 68, 68, 1)' : 'rgba(147, 51, 234, 1)'
                    ),
                    pointBorderColor: 'rgba(255, 255, 255, 1)',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
                    pointHoverBorderWidth: 3,
                    order: 1
                },
                // Lower bound (confidence interval bottom)
                {
                    label: 'Lower Bound',
                    data: sortedData.map(item => item.lower_bound),
                    borderColor: 'transparent',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    order: 2
                }
            ]
        };
    }, [predictions, hasValidData, anomalies]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.98)',
                titleColor: '#f8fafc',
                bodyColor: '#f8fafc',
                borderColor: 'rgba(147, 51, 234, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 16,
                displayColors: true,
                titleFont: {
                    family: 'Inter, system-ui, sans-serif',
                    size: 14,
                    weight: '600'
                },
                bodyFont: {
                    family: 'Inter, system-ui, sans-serif',
                    size: 13,
                    weight: '400'
                },
                callbacks: {
                    title: (context) => {
                        const label = context[0]?.label;
                        return label ? `Time: ${label}` : 'Time: --';
                    },
                    label: (context) => {
                        const value = context.parsed.y;
                        if (context.dataset.label === 'Predicted Power (W)') {
                            return `Predicted: ${value.toLocaleString()} W`;
                        }
                        if (context.dataset.label === 'Upper Bound') {
                            return `Upper: ${value.toLocaleString()} W`;
                        }
                        if (context.dataset.label === 'Lower Bound') {
                            return `Lower: ${value.toLocaleString()} W`;
                        }
                        return `${context.dataset.label}: ${value.toLocaleString()}`;
                    },
                    filter: (tooltipItem) => {
                        // Show all datasets in tooltip
                        return true;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(203, 213, 225, 0.2)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: 'Inter, system-ui, sans-serif',
                        size: 11,
                        weight: '500'
                    },
                    callback: function(value) {
                        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(203, 213, 225, 0.2)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: 'Inter, system-ui, sans-serif',
                        size: 11,
                        weight: '500'
                    },
                    maxTicksLimit: 12
                }
            }
        }
    }), []);

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

    if (!hasValidData) {
        return (
            <div className="h-80 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Forecast Available</h4>
                <p className="text-sm text-gray-500 text-center max-w-md mx-auto">
                    Forecast predictions will appear here once model is trained and ready.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Model Info Badge */}
            {modelInfo && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00.723-1.745 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {modelInfo.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            Accuracy: {((1 - modelInfo.accuracy_mape) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">
                        Trained: {formatChartDate(modelInfo.last_trained)}
                    </span>
                </div>
            )}

            {/* Chart */}
            <div className="h-80 relative">
                <Line data={chartData} options={chartOptions} />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-gray-600">Predicted</span>
                </div>
                <div className="flex items-center">
                    <div className="w-8 h-3 rounded bg-purple-100 mr-2"></div>
                    <span className="text-gray-600">Confidence Interval</span>
                </div>
                {anomalies.length > 0 && (
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-gray-600">Anomaly</span>
                    </div>
                )}
            </div>
        </div>
    );
});

ForecastChart.displayName = 'ForecastChart';

export default ForecastChart;