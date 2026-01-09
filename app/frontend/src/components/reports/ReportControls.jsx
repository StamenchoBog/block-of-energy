import { useState, memo, useCallback, useMemo } from 'react';
import { format, getISOWeek, getISOWeekYear, subWeeks } from 'date-fns';

/** Parse ISO week string (e.g., "2025-W01") into { week, year } */
const parseISOWeek = (isoWeekString) => {
    if (!isoWeekString || !isoWeekString.includes('-W')) {
        return { week: null, year: null };
    }
    const [yearStr, weekPart] = isoWeekString.split('-W');
    return {
        week: parseInt(weekPart, 10),
        year: parseInt(yearStr, 10)
    };
};

/** Get current defaults for each period type */
const getCurrentDefaults = () => {
    const now = new Date();
    // Default to LAST week (not current) for weekly reports
    const lastWeek = subWeeks(now, 1);
    const isoWeek = getISOWeek(lastWeek);
    const isoWeekYear = getISOWeekYear(lastWeek);
    return {
        date: format(now, 'yyyy-MM-dd'),
        week: `${isoWeekYear}-W${String(isoWeek).padStart(2, '0')}`,
        month: String(now.getMonth() + 1),
        year: String(now.getFullYear())
    };
};

/** Get max week value (last completed week) */
const getMaxWeek = () => {
    const lastWeek = subWeeks(new Date(), 1);
    const isoWeek = getISOWeek(lastWeek);
    const isoWeekYear = getISOWeekYear(lastWeek);
    return `${isoWeekYear}-W${String(isoWeek).padStart(2, '0')}`;
};

const ReportControls = memo(function ReportControls({
    onGenerateReport,
    isLoading
}) {
    const defaults = getCurrentDefaults();
    const [reportType, setReportType] = useState('daily');
    const [date, setDate] = useState(defaults.date);
    const [week, setWeek] = useState(defaults.week);
    const [month, setMonth] = useState(defaults.month);
    const [year, setYear] = useState(defaults.year);

    // Max week for the picker (only allow past weeks)
    const maxWeek = useMemo(() => getMaxWeek(), []);

    // Build params object based on current report type
    const buildParams = useCallback(() => {
        const params = { type: reportType };
        if (reportType === 'daily') {
            params.date = date;
        }
        if (reportType === 'weekly') {
            // Parse ISO week format "2025-W01" into separate week and year
            const parsed = parseISOWeek(week);
            params.week = String(parsed.week);
            params.year = String(parsed.year);
        }
        if (reportType === 'monthly') {
            params.month = month;
            params.year = year;
        }
        return params;
    }, [reportType, date, week, month, year]);

    const generateReport = useCallback(() => {
        onGenerateReport(buildParams());
    }, [buildParams, onGenerateReport]);

    const handleDownloadCSV = useCallback(() => {
        const params = new URLSearchParams(buildParams());
        window.location.href = `/api/report/download?${params.toString()}`;
    }, [buildParams]);

    const reportTypes = ['daily', 'weekly', 'monthly'];

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
                            max={defaults.date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    )}

                    {reportType === 'weekly' && (
                        <input
                            type="week"
                            value={week}
                            max={maxWeek}
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