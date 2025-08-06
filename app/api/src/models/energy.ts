export interface EnergyReading {
    payload: {
        ENERGY: {
            Today: number;
            Power: number;
            Voltage: number;
            Current: number;
            Factor: number;
        };
        timestamp: string;
    };
}

export interface HourlyDataPoint {
    readings: EnergyReading[];
    powerSum: number;
    powerCount: number;
    voltageSum: number;
    voltageCount: number;
    currentSum: number;
    currentCount: number;
    factorSum: number;
    factorCount: number;
}

export interface HourlyData {
    [hour: number]: HourlyDataPoint;
}

export interface DailyDataPoint {
    _id: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    month?: number;
    maxEnergy: number;
    avgPower: number;
    peakPower: number;
    avgVoltage: number;
    avgCurrent: number;
    avgFactor: number;
}

export interface ReportParams {
    type: string;
    date?: string;
    week?: number | string;
    month?: number | string;
    year?: number | string;
}

export interface ReportResponse {
    reportType: string;
    date: string;
    week?: any;
    month?: any;
    year: number | string;
    data: any[];
}
