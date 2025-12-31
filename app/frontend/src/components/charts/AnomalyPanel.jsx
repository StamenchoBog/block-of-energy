import { memo, useMemo } from 'react';
import { formatAnomalyTime } from '../../hooks/useFormatters';

const severityConfig = {
    low: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        badge: 'bg-yellow-100 text-yellow-800',
        icon: 'text-yellow-500'
    },
    medium: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        badge: 'bg-orange-100 text-orange-800',
        icon: 'text-orange-500'
    },
    high: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badge: 'bg-red-100 text-red-800',
        icon: 'text-red-500'
    }
};

const anomalyTypeConfig = {
    spike: {
        label: 'Power Spike',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
        description: 'Unusual increase in power consumption'
    },
    dip: {
        label: 'Power Dip',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
        ),
        description: 'Unexpected drop in power consumption'
    },
    pattern_change: {
        label: 'Pattern Change',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        description: 'Deviation from normal usage pattern'
    }
};

const AnomalyCard = memo(({ anomaly }) => {
    const typeConfig = anomalyTypeConfig[anomaly.anomaly_type] || anomalyTypeConfig.pattern_change;
    const scorePercent = (anomaly.anomaly_score * 100).toFixed(0);
    const deviation = ((anomaly.actual_power - anomaly.expected_power) / anomaly.expected_power * 100).toFixed(1);
    const isPositiveDeviation = anomaly.actual_power > anomaly.expected_power;

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                        {typeConfig.icon}
                    </span>
                    <div>
                        <h4 className="text-sm font-medium text-gray-900">{typeConfig.label}</h4>
                        <p className="text-xs text-gray-500">
                            {formatAnomalyTime(anomaly.timestamp)}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    anomaly.anomaly_score > 0.9 ? 'bg-red-100 text-red-700' :
                    anomaly.anomaly_score > 0.7 ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                }`}>
                    {scorePercent}% confidence
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-xs text-gray-500 mb-1">Actual</p>
                    <p className="font-semibold text-gray-900">{anomaly.actual_power.toLocaleString()} W</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">Expected</p>
                    <p className="font-medium text-gray-600">{anomaly.expected_power.toLocaleString()} W</p>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Deviation</span>
                    <span className={`text-sm font-medium ${isPositiveDeviation ? 'text-red-600' : 'text-blue-600'}`}>
                        {isPositiveDeviation ? '+' : ''}{deviation}%
                    </span>
                </div>
            </div>
        </div>
    );
});

AnomalyCard.displayName = 'AnomalyCard';

const AnomalyPanel = memo(({ anomalies = [], summary = null, loading = false }) => {
    const hasAnomalies = anomalies && anomalies.length > 0;
    const severity = summary?.severity || 'low';
    const config = severityConfig[severity];

    const sortedAnomalies = useMemo(() => {
        if (!hasAnomalies) return [];
        return [...anomalies].sort((a, b) => b.anomaly_score - a.anomaly_score);
    }, [anomalies, hasAnomalies]);

    const anomalyStats = useMemo(() => {
        if (!hasAnomalies) return null;

        const spikes = anomalies.filter(a => a.anomaly_type === 'spike').length;
        const dips = anomalies.filter(a => a.anomaly_type === 'dip').length;
        const patterns = anomalies.filter(a => a.anomaly_type === 'pattern_change').length;

        return { spikes, dips, patterns };
    }, [anomalies, hasAnomalies]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    if (!hasAnomalies) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Anomalies Detected</h4>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Your energy consumption patterns are within expected ranges. The system is monitoring continuously.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Banner */}
            <div className={`p-4 rounded-xl ${config.bg} ${config.border} border`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${config.badge}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className={`font-semibold ${config.text}`}>
                                {summary?.total_count || anomalies.length} Anomal{anomalies.length === 1 ? 'y' : 'ies'} Detected
                            </h3>
                            <p className="text-sm text-gray-600">
                                Severity: <span className="font-medium capitalize">{severity}</span>
                            </p>
                        </div>
                    </div>
                    {anomalyStats && (
                        <div className="hidden sm:flex items-center space-x-4 text-sm">
                            {anomalyStats.spikes > 0 && (
                                <span className="text-gray-600">
                                    <span className="font-medium text-red-600">{anomalyStats.spikes}</span> spike{anomalyStats.spikes !== 1 ? 's' : ''}
                                </span>
                            )}
                            {anomalyStats.dips > 0 && (
                                <span className="text-gray-600">
                                    <span className="font-medium text-blue-600">{anomalyStats.dips}</span> dip{anomalyStats.dips !== 1 ? 's' : ''}
                                </span>
                            )}
                            {anomalyStats.patterns > 0 && (
                                <span className="text-gray-600">
                                    <span className="font-medium text-orange-600">{anomalyStats.patterns}</span> pattern{anomalyStats.patterns !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Anomaly Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                {sortedAnomalies.map((anomaly, index) => (
                    <AnomalyCard key={`${anomaly.timestamp}-${index}`} anomaly={anomaly} />
                ))}
            </div>
        </div>
    );
});

AnomalyPanel.displayName = 'AnomalyPanel';

export default AnomalyPanel;