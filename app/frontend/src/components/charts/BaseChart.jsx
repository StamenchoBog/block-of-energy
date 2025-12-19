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
import { memo } from 'react';

// Register Chart.js components once globally
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

// Common chart options to reduce duplication
export const getBaseChartOptions = (overrides = {}) => ({
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
            titleFont: {
                family: 'Inter, system-ui, sans-serif',
                size: 14,
                weight: '600'
            },
            bodyFont: {
                family: 'Inter, system-ui, sans-serif',
                size: 13,
                weight: '400'
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
                }
            }
        }
    },
    elements: {
        line: {
            tension: 0.4
        }
    },
    ...overrides
});

const BaseChart = memo(({ children, className = '' }) => (
    <div className={`relative ${className}`}>
        {children}
    </div>
));

BaseChart.displayName = 'BaseChart';

export { ChartJS };
export default BaseChart;