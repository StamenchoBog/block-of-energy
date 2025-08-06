// src/types/index.ts
export interface Device {
    id: string;
    name: string;
    status: 'online' | 'offline';
    energyConsumption: number;
}

export interface ReportData {
    timestamp: string;
    consumption: number;
    generation: number;
}
