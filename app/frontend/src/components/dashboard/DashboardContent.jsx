import { memo, useMemo, useEffect, useState } from 'react';
import { useDashboardData, useReportData, usePredictions } from '../../hooks';
import EnergyChart from '../charts/EnergyChart';
import ForecastChart from '../charts/ForecastChart';
import AnomalyPanel from './AnomalyPanel';
import MetricCard, { SecondaryMetric } from '../ui/MetricCard';
import { DashboardSkeleton } from '../ui/LoadingStates';
import { ErrorDisplay } from '../ui/ErrorDisplay';

const DashboardContent = memo(({ apiUrl }) => {
    const { data, loading, error, refetch } = useDashboardData(apiUrl);
    const { data: chartData, loading: chartLoading, activeRange, fetchData: fetchChartData } = useReportData();
    const {
        forecast,
        anomalies,
        loading: predictionsLoading,
        serviceAvailable,
        isTraining,
        fetchAllPredictions
    } = usePredictions();

    const [activeTab, setActiveTab] = useState('actual');
    const [forecastHours, setForecastHours] = useState(24);

    useEffect(() => {
        fetchChartData('day');
    }, [fetchChartData]);

    // Fetch predictions when switching to forecast or analysis tab
    useEffect(() => {
        if (activeTab === 'forecast' || activeTab === 'analysis') {
            fetchAllPredictions(forecastHours);
        }
    }, [activeTab, forecastHours, fetchAllPredictions]);

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
                <DashboardSkeleton />
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

                    {/* Chart Section with Tabs */}
                    <div className="metric-card mb-8">
                        {/* Tab Navigation */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                            <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 mb-4 sm:mb-0">
                                {[
                                    { id: 'actual', label: 'Actual', icon: (
                                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    )},
                                    { id: 'forecast', label: 'Forecast', icon: (
                                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    )},
                                    { id: 'analysis', label: 'Analysis', icon: (
                                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 11.622 5.176-1.332 9-11.622z" />
                                        </svg>
                                    )}
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                            ${activeTab === tab.id
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'}
                                        `}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        {tab.id === 'analysis' && anomalies?.anomalies?.length > 0 && (
                                            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                                                {anomalies.anomalies.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Controls based on active tab */}
                            {activeTab === 'actual' && (
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
                            )}

                            {(activeTab === 'forecast' || activeTab === 'analysis') && (
                                <div className="flex items-center space-x-3">
                                    <label className="text-sm text-gray-600">Forecast horizon:</label>
                                    <select
                                        value={forecastHours}
                                        onChange={(e) => setForecastHours(Number(e.target.value))}
                                        disabled={predictionsLoading || isTraining}
                                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                                    >
                                        <option value={12}>12 hours</option>
                                        <option value={24}>24 hours</option>
                                        <option value={48}>48 hours</option>
                                        <option value={72}>72 hours</option>
                                        <option value={168}>7 days</option>
                                    </select>
                                    {isTraining && (
                                        <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4h2v-4h-2v4h2v-4h-2z"></path>
                                            </svg>
                                            Model training...
                                        </span>
                                    )}
                                    {!serviceAvailable && !isTraining && (
                                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                            Service unavailable
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'actual' && (
                            <div>
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Power Consumption</h2>
                                    <p className="text-sm text-gray-600">
                                        {activeRange === 'day' ? '24-hour trend' :
                                         activeRange === 'week' ? 'Weekly trend' : 'Monthly trend'}
                                    </p>
                                </div>
                                <EnergyChart
                                    data={chartData.length > 0 ? chartData : (data?.hourlyPowerData || [])}
                                    loading={chartLoading}
                                />
                            </div>
                        )}

                        {activeTab === 'forecast' && (
                            <div>
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Power Forecast</h2>
                                    <p className="text-sm text-gray-600">
                                        Predicted consumption for the next {forecastHours} hours with confidence intervals
                                    </p>
                                </div>
                                <ForecastChart
                                    predictions={forecast?.predictions || []}
                                    modelInfo={forecast?.model_info}
                                    loading={predictionsLoading}
                                    anomalies={anomalies?.anomalies || []}
                                />
                            </div>
                        )}

                        {activeTab === 'analysis' && (
                            <div>
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Anomaly Detection</h2>
                                    <p className="text-sm text-gray-600">
                                        Unusual patterns detected in your energy consumption
                                    </p>
                                </div>
                                <AnomalyPanel
                                    anomalies={anomalies?.anomalies || []}
                                    summary={anomalies?.summary}
                                    loading={predictionsLoading}
                                />
                            </div>
                        )}
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