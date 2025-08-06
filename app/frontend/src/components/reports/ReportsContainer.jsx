
import { useState } from 'react';
import ReportTable from './ReportTable';
import ReportControls from './ReportControls';
import { fetchReportData } from '../../lib/apiService';

export default function ReportsContainer({
                                             initialData,
                                             initialReportType,
                                             initialDate,
                                             initialWeek,
                                             initialMonth,
                                             initialYear
                                         }) {
    const [reportData, setReportData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportMetadata, setReportMetadata] = useState({
        reportType: initialReportType,
        date: initialDate,
        month: initialMonth,
        year: initialYear
    });

    const handleGenerateReport = async (params) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchReportData(params);

            if (response) {
                // Store the actual data array for the table
                setReportData(response.data || []);

                // Store metadata separately
                setReportMetadata({
                    reportType: response.reportType,
                    date: response.date,
                    month: response.month,
                    year: response.year
                });

                // Update URL parameters
                const url = new URL(window.location);
                Object.entries(params).forEach(([key, value]) => {
                    url.searchParams.set(key, value);
                });
                window.history.pushState({}, '', url);
            } else {
                setError("No data returned from API");
            }
        } catch (err) {
            console.error("Error generating report:", err);
            setError("Failed to fetch report data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ReportControls
                initialReportType={initialReportType}
                initialDate={initialDate}
                initialWeek={initialWeek}
                initialMonth={initialMonth}
                initialYear={initialYear}
                onGenerateReport={handleGenerateReport}
                isLoading={loading}
            />

            <div className="mt-8 bg-white rounded-lg shadow p-6">
                {error ? (
                    <div className="text-center py-4 text-red-500">{error}</div>
                ) : loading ? (
                    <div className="text-center py-8">Loading report data...</div>
                ) : (
                    <>
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">
                                {reportMetadata.reportType?.charAt(0).toUpperCase() + reportMetadata.reportType?.slice(1)} Report
                                {reportMetadata.date && ` - ${reportMetadata.date}`}
                            </h2>
                        </div>
                        <ReportTable data={reportData} />
                    </>
                )}
            </div>
        </>
    );
}
