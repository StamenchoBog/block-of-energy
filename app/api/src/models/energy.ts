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
    summary?: ReportSummary;
    deviceBreakdown?: DeviceBreakdown[];
}

// Summary metrics for the report period with optional comparison
export interface ReportSummary {
    totalEnergy: number;
    peakPower: number;
    comparison?: PeriodComparison;
}

// Comparison with previous period (yesterday, last week, last month)
export interface PeriodComparison {
    previousPeriod: {
        totalEnergy: number;
        peakPower: number;
    };
    changes: {
        energyChange: number;      // percentage change
        peakPowerChange: number;   // percentage change
    };
    label: string;  // "vs yesterday", "vs last week", etc.
}

// Per-device energy breakdown
export interface DeviceBreakdown {
    deviceId: string;
    totalEnergy: number;
    percentage: number;
    peakPower: number;
}

// Cost calculation types
export interface CostBreakdown {
    cost: number;
    tariffType: 'low' | 'high';
    rate: number;
    currency: string;
}

export interface CostEstimate {
    value: number;
    currency: string;
    confidence: 'low' | 'medium' | 'high';
    projectedDaily: number;
}

