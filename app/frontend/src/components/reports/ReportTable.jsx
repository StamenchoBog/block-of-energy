import { memo, useMemo } from 'react';

const UNITS = {
    peakPower: "W",
    energy: "kWh",
    cost: "MKD"
};

const HEADER_LABELS = {
    day: "Day",
    date: "Date",
    hour: "Time",
    peakPower: "Peak Power",
    energy: "Energy",
    cost: "Cost",
    tariffType: "Tariff"
};

// Columns excluded from display (handled in backend, but kept for safety)
const EXCLUDED_COLUMNS = ['power', 'voltage', 'current', 'factor'];

const TARIFF_STYLES = {
    low: 'bg-green-100 text-green-800',
    high: 'bg-orange-100 text-orange-800'
};

const formatValue = (key, value) => {
    if (value === undefined || value === null) return "—";

    if (key === "hour") {
        const hourNum = parseInt(value);
        return `${String(hourNum).padStart(2, '0')}:00`;
    }

    if (typeof value === "number") {
        if (key === "peakPower" && value > 1000) {
            return `${(value / 1000).toFixed(2)} kW`;
        }
        const formattedValue = Number.isInteger(value) ? value : value.toFixed(2);
        return UNITS[key] ? `${formattedValue} ${UNITS[key]}` : formattedValue;
    }

    return value;
};

const renderCell = (key, value) => {
    if (key === 'tariffType' && value) {
        const style = TARIFF_STYLES[value] || 'bg-gray-100 text-gray-800';
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>
                {value === 'low' ? 'Low' : 'High'}
            </span>
        );
    }
    return formatValue(key, value);
};

const ReportTable = memo(function ReportTable({ data }) {
    const headers = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
            return [];
        }
        return Object.keys(data[0]).filter(header => !EXCLUDED_COLUMNS.includes(header));
    }, [data]);

    if (headers.length === 0) {
        return null;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50">
                        {headers.map((header) => (
                            <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {HEADER_LABELS[header] || header.charAt(0).toUpperCase() + header.slice(1)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                            {headers.map((header) => (
                                <td
                                    key={`${rowIndex}-${header}`}
                                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                                >
                                    {renderCell(header, row[header])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default ReportTable;