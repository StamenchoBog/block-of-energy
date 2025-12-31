import { memo } from 'react';

const formatValue = (value, decimals = 2) => {
    if (value === null || value === undefined) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toFixed(decimals);
};

const PercentageBar = memo(({ percentage }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, percentage)}%` }}
            />
        </div>
        <span className="text-xs text-gray-500 w-12 text-right">{formatValue(percentage, 1)}%</span>
    </div>
));

PercentageBar.displayName = 'PercentageBar';

const DeviceBreakdownTable = memo(({ deviceBreakdown }) => {
    if (!deviceBreakdown || deviceBreakdown.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Device Breakdown</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Device
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Energy (kWh)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Share
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Peak (W)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {deviceBreakdown.map((device, index) => (
                            <tr key={device.deviceId || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"
                                            style={{
                                                backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                                            }}
                                        />
                                        <span className="text-sm font-medium text-gray-900">
                                            {device.deviceId || 'Unknown'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                    {formatValue(device.totalEnergy)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <PercentageBar percentage={device.percentage} />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                                    {formatValue(device.peakPower)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

DeviceBreakdownTable.displayName = 'DeviceBreakdownTable';

export default DeviceBreakdownTable;
