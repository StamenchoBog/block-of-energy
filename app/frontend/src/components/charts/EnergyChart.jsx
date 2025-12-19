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

const EnergyChart = memo(({ data = [], loading = false, title = "Power Consumption", metric = "power", unit = "W", subtitle = null }) => {
    const hasValidData = data && Array.isArray(data) && data.length > 0;

    const isMultiDay = useMemo(() => {
        if (!hasValidData || data.length < 2) return false;
        const firstDate = new Date(data[0].timestamp);
        const lastDate = new Date(data[data.length - 1].timestamp);
        return firstDate.toDateString() !== lastDate.toDateString();
    }, [data, hasValidData]);

    const chartData = useMemo(() => {
        if (!hasValidData) return null;

        const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
            labels: sortedData.map(item => {
                try {
                    const date = new Date(item.timestamp);
                    if (isNaN(date.getTime())) return 'Invalid';

                    if (isMultiDay) {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } catch {
                    return 'Invalid';
                }
            }),
            datasets: [
                {
                    label: `${metric.charAt(0).toUpperCase() + metric.slice(1)} (${unit})`,
                    data: sortedData.map(item => {
                        const value = item[metric] || item.power || 0;
                        return typeof value === 'number' ? value : parseFloat(value) || 0;
                    }),
                    borderColor: 'rgba(14, 165, 233, 1)',
                    backgroundColor: 'rgba(14, 165, 233, 0.08)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(14, 165, 233, 1)',
                    pointBorderColor: 'rgba(255, 255, 255, 1)',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: 'rgba(14, 165, 233, 1)',
                    pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
                    pointHoverBorderWidth: 4
                }
            ]
        };
    }, [data, hasValidData, metric, unit, isMultiDay]);

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
                borderColor: 'rgba(14, 165, 233, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 16,
                displayColors: false,
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
                        return `${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${value.toLocaleString()} ${unit}`;
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
                },
                title: {
                    display: false
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
                    maxTicksLimit: 8
                },
                title: {
                    display: false
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            }
        }
    }), [metric, unit]);

    if (loading) {
        return (
            <div className="chart-container animate-pulse">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                </div>
                <div className="h-80 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    const displaySubtitle = subtitle || (isMultiDay ? `${data.length} days` : '24-hour trend');

    if (!hasValidData) {
        return (
            <div className="chart-container">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">{displaySubtitle}</p>
                    </div>
                </div>
                <div className="h-80 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h4>
                    <p className="text-sm text-gray-500 text-center max-w-md mx-auto">
                        Energy data will appear here once sensors start reporting measurements.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{displaySubtitle}</p>
                </div>
            </div>
            <div className="h-80 relative">
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
});

EnergyChart.displayName = 'EnergyChart';

export default EnergyChart;