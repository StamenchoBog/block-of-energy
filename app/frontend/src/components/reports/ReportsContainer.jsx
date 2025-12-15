import { useState, useCallback, useMemo, useEffect } from 'react';
import ReportTable from './ReportTable';
import ReportControls from './ReportControls';
import { fetchReportData } from '../../lib/apiService';

function getUrlParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
        type: params.get('type') || 'daily',
        date: params.get('date') || new Date().toISOString().split('T')[0],
        week: params.get('week') || '',
        month: params.get('month') || '1',
        year: params.get('year') || new Date().getFullYear().toString()
    };
}

export default function ReportsContainer() {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportMetadata, setReportMetadata] = useState(() => {
        const params = getUrlParams();
        return {
            reportType: params.type || 'daily',
            date: params.date,
            week: params.week,
            month: params.month,
            year: params.year
        };
    });

    const validateReportParams = (params) => {
        if (!params.type) {
            throw new Error('Report type is required');
        }

        const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!validTypes.includes(params.type)) {
            throw new Error(`Invalid report type: ${params.type}`);
        }

        if (params.date && !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
            throw new Error('Invalid date format');
        }

        return true;
    };

    const handleGenerateReport = useCallback(async (params) => {
        setLoading(true);
        setError(null);

        try {
            validateReportParams(params);
            const response = await fetchReportData(params);

            if (response && (response.data || response.length > 0)) {
                const data = response.data || response;

                if (!Array.isArray(data)) {
                    throw new Error('Invalid response format');
                }

                setReportData(data);
                setReportMetadata({
                    reportType: params.type,
                    date: params.date,
                    week: params.week,
                    month: params.month,
                    year: params.year
                });

                try {
                    const url = new URL(window.location);
                    Object.entries(params).forEach(([key, value]) => {
                        if (value) {
                            url.searchParams.set(key, String(value));
                        } else {
                            url.searchParams.delete(key);
                        }
                    });
                    window.history.replaceState({}, '', url);
                } catch (urlError) {
                    console.warn('Failed to update URL:', urlError);
                }
            } else {
                setError("No data available for the selected period");
                setReportData([]);
            }
        } catch (err) {
            console.error("Error generating report:", err);
            setError(err.message || "Failed to fetch report data");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const params = getUrlParams();
        handleGenerateReport(params);
    }, []);

    const reportSummary = useMemo(() => {
        const { reportType, date, week, month, year } = reportMetadata;
        if (!reportType) return { title: 'Energy Report', subtitle: '' };

        const capitalizedType = reportType.charAt(0).toUpperCase() + reportType.slice(1);
        let subtitle = '';

        switch (reportType) {
            case 'daily':
                subtitle = date ? new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : '';
                break;
            case 'weekly':
                subtitle = week ? `Week ${week}${year ? `, ${year}` : ''}` : '';
                break;
            case 'monthly':
                if (month && year) {
                    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
                    subtitle = `${monthName} ${year}`;
                }
                break;
            case 'yearly':
                subtitle = year || '';
                break;
        }

        return { title: `${capitalizedType} Report`, subtitle };
    }, [reportMetadata]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Energy Reports</h1>
                <p className="text-sm text-gray-500 mt-1">Generate and export energy consumption reports</p>
            </div>

            {/* Controls */}
            <div className="mb-6">
                <ReportControls
                    initialReportType={reportMetadata.reportType}
                    initialDate={reportMetadata.date}
                    initialWeek={reportMetadata.week}
                    initialMonth={reportMetadata.month}
                    initialYear={reportMetadata.year}
                    onGenerateReport={handleGenerateReport}
                    isLoading={loading}
                />
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl border border-gray-200">
                {error ? (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Try again
                        </button>
                    </div>
                ) : loading ? (
                    <div className="p-6 animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-4 bg-gray-100 rounded"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{reportSummary.title}</h2>
                                    {reportSummary.subtitle && (
                                        <p className="text-sm text-gray-500">{reportSummary.subtitle}</p>
                                    )}
                                </div>
                                {reportData.length > 0 && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {reportData.length} records
                                    </span>
                                )}
                            </div>
                        </div>

                        {reportData.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-600">No data available for the selected period</p>
                            </div>
                        ) : (
                            <ReportTable data={reportData} reportType={reportMetadata.reportType} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}