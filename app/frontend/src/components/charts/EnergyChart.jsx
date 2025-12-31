import { Line } from 'react-chartjs-2';
import { memo, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { toDate, formatChartDate, formatChartTime } from '../../hooks/useFormatters';
import { getBaseChartOptions, CHART_COLORS } from './BaseChart';

const EnergyChart = memo(({ data = [], loading = false, title = "Power Consumption", metric = "power", unit = "W", subtitle = null }) => {
    const hasValidData = useMemo(() =>
        data?.some(item => item[metric] != null), [data, metric]);

    const { isMultiDay, dateRangeLabel } = useMemo(() => {
        if (!data?.length) return { isMultiDay: false, dateRangeLabel: null };

        const dates = data.map(d => toDate(d.timestamp));
        const first = dates[0], last = dates[dates.length - 1];
        const isMulti = differenceInDays(last, first) >= 1;

        return {
            isMultiDay: isMulti,
            dateRangeLabel: isMulti
                ? `${formatChartDate(first)} - ${formatChartDate(last)}`
                : formatChartDate(first)
        };
    }, [data]);

    const chartData = useMemo(() => {
        if (!hasValidData) return null;

        return {
            labels: data.map(item => isMultiDay
                ? formatChartDate(item.timestamp)
                : formatChartTime(item.timestamp)
            ),
            datasets: [{
                label: `${metric.charAt(0).toUpperCase() + metric.slice(1)} (${unit})`,
                data: data.map(item => item[metric] ?? item.power),
                spanGaps: false,
                borderColor: CHART_COLORS.blue.border,
                backgroundColor: CHART_COLORS.blue.background,
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 8,
                pointBackgroundColor: CHART_COLORS.blue.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 3
            }]
        };
    }, [data, hasValidData, metric, unit, isMultiDay]);

    const chartOptions = useMemo(() => getBaseChartOptions({
        tooltipBorderColor: CHART_COLORS.blue.border,
        maxXTicks: 8,
        plugins: {
            tooltip: {
                displayColors: false,
                callbacks: {
                    title: (ctx) => ctx[0]?.label ? `Time: ${ctx[0].label}` : 'Time: --',
                    label: (ctx) => `${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${ctx.parsed.y?.toLocaleString() ?? '--'} ${unit}`
                }
            }
        }
    }), [metric, unit]);

    const displaySubtitle = subtitle || (dateRangeLabel
        ? `${isMultiDay ? (differenceInDays(toDate(data[data.length-1]?.timestamp), toDate(data[0]?.timestamp)) >= 7 ? 'Weekly' : 'Multi-day') : '24-hour'} trend · ${dateRangeLabel}`
        : '24-hour trend');

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