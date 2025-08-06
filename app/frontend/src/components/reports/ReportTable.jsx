export default function ReportTable({ data }) {
    if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
        return <div className="text-center py-4">No report data available.</div>;
    }

    // Get column headers from the first item but filter out "power"
    const headers = Object.keys(data[0]).filter(header => header !== "power");

    const units = {
        peakPower: "W",
        energy: "kWh",
        voltage: "V",
        current: "A",
        factor: ""
    };

    const formatValue = (key, value) => {
        if (value === undefined || value === null) return "—";

        // Format hour values
        if (key === "hour") {
            const hourNum = parseInt(value);
            return `${String(hourNum).padStart(2, '0')}:00`;
        }

        // Format numerical values with units
        if (typeof value === "number") {
            // Format power values: show in kW if > 1000W
            if (key === "peakPower" && value > 1000) {
                return `${(value/1000).toFixed(2)} kW`;
            }

            // Format with 2 decimal places for most values
            const formattedValue = Number.isInteger(value) ? value : value.toFixed(2);
            return units[key] ? `${formattedValue} ${units[key]}` : formattedValue;
        }

        return value;
    };

    const headerLabels = {
        day: "Day",
        date: "Date",
        hour: "Time",
        peakPower: "Peak Power",
        energy: "Energy",
        voltage: "Voltage",
        current: "Current",
        factor: "Power Factor"
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
                <thead>
                <tr className="bg-gray-100">
                    {headers.map((header) => (
                        <th key={header} className="border px-4 py-2 text-left">
                            {headerLabels[header] || header.charAt(0).toUpperCase() + header.slice(1)}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="border px-4 py-2">
                                {formatValue(header, row[header])}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}