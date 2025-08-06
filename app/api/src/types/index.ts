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
}

export type ApiRequest = Request;
export type ApiResponse = Response;
