import { memo, useMemo, useEffect } from 'react';
import { useDashboardData, useReportData } from '../../hooks';
import EnergyChart from '../charts/EnergyChart';

const MetricCard = memo(({ title, subtitle, value, unit, icon, colorClass, large = false }) => (
    <div className={`metric-card ${large ? 'col-span-1 md:col-span-2 lg:col-span-1' : ''}`}>
        <div className="flex items-center justify-between mb-4">
            <div>
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    {title}
                </h3>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 ${colorClass?.bg || 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                {icon}
            </div>
        </div>
        <div className="flex items-baseline">
            <span className={`${large ? 'text-4xl' : 'text-3xl'} font-bold ${colorClass?.text || 'text-gray-600'}`}>
                {value}
            </span>
            {unit && <span className="ml-2 text-lg font-medium text-gray-500">{unit}</span>}
        </div>
    </div>
));

MetricCard.displayName = 'MetricCard';

const SecondaryMetric = memo(({ title, value, unit }) => (
    <div className="metric-card">
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

const LoadingSkeleton = () => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="metric-card animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
            ))}
        </div>
        <div className="metric-card mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
        </div>
    </>
);

const ErrorDisplay = ({ error, onRetry }) => (
    <div className="metric-card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={onRetry} className="btn-modern primary">
            Try Again
        </button>
    </div>
);

const DashboardContent = memo(({ apiUrl }) => {
    const { data, loading, error, refetch } = useDashboardData(apiUrl);
    const { data: chartData, loading: chartLoading, activeRange, fetchData: fetchChartData } = useReportData();

    useEffect(() => {
        fetchChartData('day');
    }, [fetchChartData]);

    const lastUpdated = useMemo(() => {
        if (!data?.power?.processingTimestamp) return 'N/A';
        return new Date(data.power.processingTimestamp).toLocaleString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }, [data?.power?.processingTimestamp]);

    if (error && !data) {
        return <ErrorDisplay error={error} onRetry={refetch} />;
    }

    return (
        <>
            {/* Header */}
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Energy Overview</h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${loading ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></span>
                                {loading ? 'Updating...' : 'Live Monitoring'}
                            </span>
                            <span>Last updated: {lastUpdated}</span>
                        </div>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <button onClick={refetch} disabled={loading} className="btn-modern primary disabled:opacity-50">
                            <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {loading && !data ? (
                <LoadingSkeleton />
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <MetricCard
                            title="Current Power"
                            subtitle="Real-time consumption"
                            value={data?.power?.value || '0'}
                            unit="W"
                            large
                            colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                            icon={
                                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.5,1 L6,9 L10,9 L12.5,23 L18,15 L14,15 L11.5,1 Z"/>
                                </svg>
                            }
                        />
                        <MetricCard
                            title="Today's Energy"
                            subtitle="Total consumption"
                            value={data?.energyToday?.value || '0'}
                            unit="kWh"
                            colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
                            icon={
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2,4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"/>
                                </svg>
                            }
                        />
                        <MetricCard
                            title="Voltage"
                            subtitle="Grid stability"
                            value={data?.voltage?.value || '0'}
                            unit="V"
                            colorClass={{ bg: 'bg-yellow-100', text: 'text-yellow-600' }}
                            icon={
                                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            }
                        />
                        <MetricCard
                            title="Power Factor"
                            subtitle="Efficiency"
                            value={data?.powerFactor?.value || '0'}
                            colorClass={{ bg: 'bg-gray-100', text: 'text-gray-600' }}
                            icon={
                                <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                </svg>
                            }
                        />
                    </div>

                    {/* Chart Section */}
                    <div className="metric-card mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Power Consumption</h2>
                                <p className="text-sm text-gray-600">
                                    {activeRange === 'day' ? '24-hour trend' :
                                     activeRange === 'week' ? 'Weekly trend' : 'Monthly trend'}
                                </p>
                            </div>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                {['day', 'week', 'month'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => fetchChartData(range)}
                                        disabled={chartLoading}
                                        className={`px-4 py-2 text-sm font-medium transition-colors
                                            ${activeRange === range
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'}
                                            ${range !== 'day' ? 'border-l border-gray-200' : ''}
                                            disabled:opacity-50
                                        `}
                                    >
                                        {range.charAt(0).toUpperCase() + range.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <EnergyChart
                            data={chartData.length > 0 ? chartData : (data?.hourlyPowerData || [])}
                            loading={chartLoading}
                        />
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SecondaryMetric title="Apparent Power" value={data?.apparentPower?.value || '0'} unit="VA" />
                        <SecondaryMetric title="Reactive Power" value={data?.reactivePower?.value || '0'} unit="VAr" />
                        <SecondaryMetric title="Total Energy" value={data?.energyTotal?.value || '0'} unit="kWh" />
                    </div>
                </>
            )}
        </>
    );
});

DashboardContent.displayName = 'DashboardContent';

export default DashboardContent;
