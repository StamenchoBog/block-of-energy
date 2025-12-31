import { Request, Response } from 'express';

export interface TasmotaDevice {
    _id: string;
    deviceId: string;
    payload: {
        ENERGY?: {
            TotalStartTime: string;
            Total: number;
            Yesterday: number;
            Today: number;
            Period: number;
            Power: number;
            ApparentPower: number;
            ReactivePower: number;
            Factor: number;
            Voltage: number;
            Current: number;
        };
        Wifi?: {
            AP: number;
            SSId: string;
            BSSId: string;
            Channel: number;
            Mode: string;
            RSSI: number;
            Signal: number;
            LinkCount: number;
            Downtime: string;
        };
        [key: string]: any;
    };
    processingTimestamp: string;
    cosmosInsertTimestamp: string;
    status: string;
}

export interface DashboardSummary {
    power: { value: string; processingTimestamp: Date };
    voltage: { value: string };
    current: { value: string };
    energyToday: { value: string };
    powerFactor: { value: string };
    apparentPower: { value: string };
    reactivePower: { value: string };
    energyTotal: { value: string };

    // New properties
    hourlyPowerData: {
        timestamp: Date;
        power: number;
        energy: number;
    }[];

    dailySummary: {
        _id: string;
        avgPower: number;
        maxPower: number;
        minPower: number;
        energyConsumed: number;
        readingCount: number;
    }[];

    todayData: {
        timestamp: Date;
        power: number;
        voltage: number;
        energy: number;
    }[];

    estimatedCost?: {
        value: number;
        currency: string;
        confidence: 'low' | 'medium' | 'high';
        projectedDaily: number;
    };
}

export type ApiRequest = Request;
export type ApiResponse = Response;

export interface ForecastPrediction {
    timestamp: string;
    predicted_power: number;
    lower_bound: number;
    upper_bound: number;
}

export interface ModelInfo {
    name: string;
    accuracy_mape: number;
    last_trained: string;
}

export interface ForecastResponse {
    predictions: ForecastPrediction[];
    model_info: ModelInfo;
}

export interface Anomaly {
    timestamp: string;
    actual_power: number;
    expected_power: number;
    anomaly_score: number;
    anomaly_type: 'spike' | 'dip' | 'pattern_change';
}

export interface AnomalySummary {
    total_count: number;
    severity: 'low' | 'medium' | 'high';
}

export interface AnomalyResponse {
    anomalies: Anomaly[];
    summary: AnomalySummary;
}

export interface ModelStatus {
    is_trained: boolean;
    last_trained: string | null;
    data_points_used: number;
    status: 'ready' | 'initializing';
}

export interface TrainResponse {
    message: string;
    status: string;
}
