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
import annotationPlugin from 'chartjs-plugin-annotation';

// Register Chart.js components once globally
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
);

// Deep merge utility for combining chart options
const deepMerge = (target, source) => {
    if (!source) return target;
    const result = { ...target };

    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    });

    return result;
};

// Color themes for different chart types
export const CHART_COLORS = {
    blue: {
        primary: 'rgba(14, 165, 233, 1)',
        primaryLight: 'rgba(14, 165, 233, 0.08)',
        background: 'rgba(14, 165, 233, 0.15)',
        border: 'rgba(14, 165, 233, 0.3)'
    },
    purple: {
        primary: 'rgba(147, 51, 234, 1)',
        primaryLight: 'rgba(147, 51, 234, 0.1)',
        background: 'rgba(147, 51, 234, 0.15)',
        border: 'rgba(147, 51, 234, 0.3)'
    },
    red: {
        primary: 'rgba(239, 68, 68, 1)',
        primaryLight: 'rgba(239, 68, 68, 0.1)',
        background: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)'
    }
};

// Shared tooltip configuration
export const getBaseTooltipConfig = (borderColor = CHART_COLORS.blue.border) => ({
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    titleColor: '#f8fafc',
    bodyColor: '#f8fafc',
    borderColor,
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
});

// Shared scales configuration
export const getBaseScalesConfig = (options = {}) => ({
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
        title: { display: false },
        ...options.y
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
            maxTicksLimit: options.maxXTicks || 8
        },
        title: { display: false },
        ...options.x
    }
});

// Main chart options builder with deep merge support
export const getBaseChartOptions = (overrides = {}) => {
    const base = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: getBaseTooltipConfig(overrides.tooltipBorderColor)
        },
        scales: getBaseScalesConfig({ maxXTicks: overrides.maxXTicks }),
        elements: {
            line: { tension: 0.4 }
        }
    };

    return deepMerge(base, overrides);
};

export { ChartJS };