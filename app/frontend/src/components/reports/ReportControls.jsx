import { useState } from 'react';

export default function ReportControls({
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

    const handleSubmit = (e) => {
        e.preventDefault();
        generateReport();
    };

    const generateReport = () => {
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
    };

    const handleDownloadCSV = () => {
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
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="p-4 bg-slate-50 rounded-xl shadow mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-grow">
                        <span className="font-bold mr-4 text-slate-700">Select Report Type:</span>
                        <div className="join">
                            <button
                                type="button"
                                onClick={() => setReportType('daily')}
                                className={`btn join-item border-slate-300 ${reportType === 'daily' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                            >Daily</button>
                            <button
                                type="button"
                                onClick={() => setReportType('weekly')}
                                className={`btn join-item border-slate-300 ${reportType === 'weekly' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                            >Weekly</button>
                            <button
                                type="button"
                                onClick={() => setReportType('monthly')}
                                className={`btn join-item border-slate-300 ${reportType === 'monthly' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                            >Monthly</button>
                            <button
                                type="button"
                                onClick={() => setReportType('yearly')}
                                className={`btn join-item border-slate-300 ${reportType === 'yearly' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                            >Yearly</button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                        {/* Date pickers */}
                        <div className="w-full sm:w-auto">
                            {reportType === 'daily' && (
                                <div>
                                    <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
                                    <input
                                        id="date-picker"
                                        type="date"
                                        name="date"
                                        className="input w-full sm:w-auto border-slate-300 bg-white focus:ring-slate-500 focus:border-slate-500"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            )}

                            {reportType === 'weekly' && (
                                <div>
                                    <label htmlFor="week-picker" className="block text-sm font-medium text-slate-700 mb-1">Select Week</label>
                                    <input
                                        id="week-picker"
                                        type="week"
                                        name="week"
                                        className="input w-full sm:w-auto border-slate-300 bg-white focus:ring-slate-500 focus:border-slate-500"
                                        value={week}
                                        onChange={(e) => setWeek(e.target.value)}
                                    />
                                </div>
                            )}

                            {reportType === 'monthly' && (
                                <div className="flex gap-2">
                                    <div>
                                        <label htmlFor="month-picker" className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                                        <select
                                            id="month-picker"
                                            name="month"
                                            className="select w-full border-slate-300 bg-white focus:ring-slate-500 focus:border-slate-500"
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i+1} value={i+1}>
                                                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="month-year-picker" className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                        <input
                                            id="month-year-picker"
                                            type="number"
                                            name="year"
                                            placeholder="YYYY"
                                            className="input w-full border-slate-300 bg-white focus:ring-slate-500 focus:border-slate-500"
                                            min="2020"
                                            max={new Date().getFullYear() + 5}
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {reportType === 'yearly' && (
                                <div>
                                    <label htmlFor="year-picker" className="block text-sm font-medium text-slate-700 mb-1">Select Year</label>
                                    <input
                                        id="year-picker"
                                        type="number"
                                        name="year"
                                        placeholder="YYYY"
                                        className="input w-full sm:w-auto border-slate-300 bg-white focus:ring-slate-500 focus:border-slate-500"
                                        min="2020"
                                        max={new Date().getFullYear() + 5}
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 sm:mt-0 sm:self-end flex gap-2">
                            <button
                                type="button"
                                onClick={generateReport}
                                disabled={isLoading}
                                className="btn bg-slate-600 hover:bg-slate-700 text-white border-none w-full sm:w-auto"
                            >
                                {isLoading ? 'Loading...' : 'Generate Report'}
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadCSV}
                                disabled={isLoading}
                                className="btn bg-slate-700 hover:bg-slate-800 text-white border-none"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
