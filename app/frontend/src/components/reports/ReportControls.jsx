import { useState, memo, useCallback } from 'react';

const ReportControls = memo(function ReportControls({
    initialReportType,
    initialDate,
    initialWeek,
    initialMonth,
    initialYear,
    onGenerateReport,
    isLoading
}) {
    const [reportType, setReportType] = useState(initialReportType);
    const [date, setDate] = useState(initialDate);
    const [week, setWeek] = useState(initialWeek);
    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);

    const generateReport = useCallback(() => {
        const params = { type: reportType };

        if (reportType === 'daily') params.date = date;
        if (reportType === 'weekly') {
            params.week = week;
            params.year = year;
        }
        if (reportType === 'monthly') {
            params.month = month;
            params.year = year;
        }
        if (reportType === 'yearly') params.year = year;

        onGenerateReport(params);
    }, [reportType, date, week, month, year, onGenerateReport]);

    const handleDownloadCSV = useCallback(() => {
        const params = new URLSearchParams();
        params.set('type', reportType);

        if (reportType === 'daily') params.set('date', date);
        if (reportType === 'weekly') {
            params.set('week', week);
            params.set('year', year);
        }
        if (reportType === 'monthly') {
            params.set('month', month);
            params.set('year', year);
        }
        if (reportType === 'yearly') params.set('year', year);

        window.location.href = `/api/report/download?${params.toString()}`;
    }, [reportType, date, week, month, year]);

    const reportTypes = ['daily', 'weekly', 'monthly', 'yearly'];

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Report Type Toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {reportTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setReportType(type)}
                            className={`px-4 py-2 text-sm font-medium transition-colors
                                ${reportType === type
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'}
                                ${type !== 'daily' ? 'border-l border-gray-200' : ''}
                            `}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-3">
                    {reportType === 'daily' && (
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    )}

                    {reportType === 'weekly' && (
                        <input
                            type="week"
                            value={week}
                            onChange={(e) => setWeek(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    )}

                    {reportType === 'monthly' && (
                        <>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="Year"
                                min="2020"
                                max={new Date().getFullYear() + 5}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </>
                    )}

                    {reportType === 'yearly' && (
                        <input
                            type="number"
                            placeholder="Year"
                            min="2020"
                            max={new Date().getFullYear() + 5}
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 lg:ml-auto">
                    <button
                        type="button"
                        onClick={generateReport}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Generate'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadCSV}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ReportControls;