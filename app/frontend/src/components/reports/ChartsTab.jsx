import { memo, useState, useEffect } from 'react';
import { useReportData, usePredictions } from '../../hooks';
import EnergyChart from '../charts/EnergyChart';
import ForecastChart from '../charts/ForecastChart';
import AnomalyPanel from '../charts/AnomalyPanel';
import TabNavigation from '../ui/TabNavigation';

// Icons for sub-tabs
const ChartIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const ForecastIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const AnalysisIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const ChartsTab = memo(function ChartsTab() {
    const { data: chartData, loading: chartLoading, activeRange, fetchData: fetchChartData } = useReportData();
    const {
        forecast,
        anomalies,
        loading: predictionsLoading,
        serviceAvailable,
        isTraining,
        fetchAllPredictions
    } = usePredictions();

    const [activeSubTab, setActiveSubTab] = useState('consumption');
    const [forecastHours, setForecastHours] = useState(24);
    const [initialized, setInitialized] = useState(false);

    // Lazy load - fetch data only when tab is first activated
    useEffect(() => {
        if (!initialized) {
            fetchChartData('day');
            setInitialized(true);
        }
    }, [initialized, fetchChartData]);

    // Fetch predictions when switching to forecast or analysis sub-tab
    useEffect(() => {
        if (activeSubTab === 'forecast' || activeSubTab === 'analysis') {
            fetchAllPredictions(forecastHours);
        }
    }, [activeSubTab, forecastHours, fetchAllPredictions]);

    const subTabs = [
        { id: 'consumption', label: 'Consumption', icon: <ChartIcon /> },
        { id: 'forecast', label: 'Forecast', icon: <ForecastIcon /> },
        {
            id: 'analysis',
            label: 'Analysis',
            icon: <AnalysisIcon />,
            badge: anomalies?.anomalies?.length || 0
        }
    ];

    const handleTimeRangeChange = (range) => {
        fetchChartData(range);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Sub-tab Navigation and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <TabNavigation
                    tabs={subTabs}
                    activeTab={activeSubTab}
                    onChange={setActiveSubTab}
                />

                {/* Time Range Controls */}
                <div className="mt-4 sm:mt-0">
                    {activeSubTab === 'consumption' && (
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                            {['day', 'week', 'month'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => handleTimeRangeChange(range)}
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

                    {(activeSubTab === 'forecast' || activeSubTab === 'analysis') && (
                        <div className="flex items-center space-x-3">
                            <label className="text-sm text-gray-600">Horizon:</label>
                            <select
                                value={forecastHours}
                                onChange={(e) => setForecastHours(Number(e.target.value))}
                                disabled={predictionsLoading || isTraining}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                                <option value={12}>12 hours</option>
                                <option value={24}>24 hours</option>
                                <option value={48}>48 hours</option>
                            </select>
                            {isTraining && (
                                <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Training...
                                </span>
                            )}
                            {!serviceAvailable && !isTraining && (
                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                    Unavailable
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Content */}
            {activeSubTab === 'consumption' && (
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Power Consumption</h3>
                        <p className="text-sm text-gray-500">
                            {activeRange === 'day' ? '24-hour trend' :
                             activeRange === 'week' ? 'Weekly trend' : 'Monthly trend'}
                        </p>
                    </div>
                    <EnergyChart
                        data={chartData}
                        loading={chartLoading}
                    />
                </div>
            )}

            {activeSubTab === 'forecast' && (
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Power Forecast</h3>
                        <p className="text-sm text-gray-500">
                            Predicted consumption for the next {forecastHours} hours
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

            {activeSubTab === 'analysis' && (
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
                        <p className="text-sm text-gray-500">
                            Unusual patterns in energy consumption
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
    );
});

export default ChartsTab;