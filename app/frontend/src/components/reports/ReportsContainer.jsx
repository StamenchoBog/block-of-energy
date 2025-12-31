import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import ReportTable from './ReportTable';
import ReportControls from './ReportControls';
import ReportSummaryCards from './ReportSummaryCards';
import DeviceBreakdownTable from './DeviceBreakdownTable';
import ChartsTab from './ChartsTab';
import TabNavigation from '../ui/TabNavigation';
import { fetchReportData } from '../../lib/apiService';

// Icons for main tabs
const ReportsIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ChartsIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
);

export default function ReportsContainer() {
    const [activeMainTab, setActiveMainTab] = useState('reports');

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportMetadata, setReportMetadata] = useState({
        reportType: 'daily',
        date: format(new Date(), 'yyyy-MM-dd'),
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear())
    });
    const [periodSummary, setPeriodSummary] = useState(null);
    const [deviceBreakdown, setDeviceBreakdown] = useState([]);
    const initialLoadDone = useRef(false);

    const mainTabs = [
        { id: 'reports', label: 'Reports', icon: <ReportsIcon /> },
        { id: 'charts', label: 'Charts', icon: <ChartsIcon /> }
    ];

    const handleGenerateReport = useCallback(async (params) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchReportData(params);
            const data = response?.data || response;

            // Always update metadata for the selected period
            setReportMetadata({
                reportType: params.type,
                date: params.date,
                week: params.week,
                month: params.month,
                year: params.year
            });

            if (Array.isArray(data) && data.length > 0) {
                setReportData(data);
                setPeriodSummary(response?.summary || null);
                setDeviceBreakdown(response?.deviceBreakdown || []);
            } else {
                setReportData([]);
                setPeriodSummary(null);
                setDeviceBreakdown([]);
            }
        } catch (err) {
            console.error("Error generating report:", err);
            setError(err.message || "Failed to fetch report data");
            setReportData([]);
            setPeriodSummary(null);
            setDeviceBreakdown([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-generate today's report on mount
    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        handleGenerateReport({ type: 'daily', date: format(new Date(), 'yyyy-MM-dd') });
    }, [handleGenerateReport]);

    const reportSummary = useMemo(() => {
        const { reportType, date, week, month, year } = reportMetadata;
        if (!reportType) return { title: 'Energy Report', subtitle: '' };

        const capitalizedType = reportType.charAt(0).toUpperCase() + reportType.slice(1);
        let subtitle = '';

        switch (reportType) {
            case 'daily':
                subtitle = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
        }

        return { title: `${capitalizedType} Report`, subtitle };
    }, [reportMetadata]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Main Tab Navigation */}
            <div className="mb-6">
                <TabNavigation
                    tabs={mainTabs}
                    activeTab={activeMainTab}
                    onChange={setActiveMainTab}
                    size="md"
                />
            </div>

            {/* Tab Content */}
            {activeMainTab === 'reports' ? (
                <>
                    {/* Report Controls */}
                    <div className="mb-6">
                        <ReportControls
                            onGenerateReport={handleGenerateReport}
                            isLoading={loading}
                        />
                    </div>

                    {/* Report Results */}
                    <div className="bg-white rounded-xl border border-gray-200">
                        {error ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-600">{error}</p>
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
                                    <div className="p-6">
                                        <ReportSummaryCards summary={periodSummary} />
                                        <DeviceBreakdownTable deviceBreakdown={deviceBreakdown} />
                                        <ReportTable data={reportData} reportType={reportMetadata.reportType} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <ChartsTab />
            )}
        </div>
    );
}