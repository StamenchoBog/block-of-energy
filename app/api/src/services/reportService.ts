import { Collection } from 'mongodb';
import logger from '../config/logger';
import { DailyDataPoint, ReportParams, ReportResponse } from '../models/energy';
import { getDatabase } from "../config/database";

export class ReportService {
    async generateReport(
        params: ReportParams
    ): Promise<ReportResponse> {
        const { type = 'daily', date, week, month, year } = params;
        const reportType = String(type).toLowerCase();
        const currentYear = year || new Date().getFullYear();

        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');

        logger.info(`Generating ${reportType} report`, { params });

        let reportData: any[] = [];

        try {
            switch(reportType) {
                case 'daily':
                    reportData = await this.generateDailyReport(collection, date);
                    break;
                case 'weekly':
                    reportData = await this.generateWeeklyReport(collection, parseInt(String(week)), parseInt(String(currentYear)));
                    break;
                case 'monthly':
                    reportData = await this.generateMonthlyReport(collection, parseInt(String(month)), parseInt(String(currentYear)));
                    break;
                case 'yearly':
                    reportData = await this.generateYearlyReport(collection, parseInt(String(currentYear)));
                    break;
                default:
                    throw new Error(`Invalid report type: ${reportType}`);
            }

            return {
                reportType,
                date: date || new Date().toISOString().split('T')[0],
                week,
                month,
                year: currentYear,
                data: reportData
            };
        } catch (error) {
            logger.error(`Error generating ${reportType} report:`, error);
            throw error;
        }
    }

    private async generateDailyReport(collection: Collection, date?: string): Promise<any[]> {
        const dailyDate = date ? String(date) : new Date().toISOString().split('T')[0];
        const startDate = new Date(`${dailyDate}T00:00:00.000Z`);
        const endDate = new Date(`${dailyDate}T23:59:59.999Z`);

        logger.debug('Daily query date range:', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });

        const hourlyData = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    "payload.timestamp": {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    }
                }
            },
            {
                $group: {
                    _id: { $hour: { $toDate: "$payload.timestamp" } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    peakPower: { $max: "$payload.ENERGY.Power" },
                    avgVoltage: { $avg: "$payload.ENERGY.Voltage" },
                    avgCurrent: { $avg: "$payload.ENERGY.Current" },
                    avgFactor: { $avg: "$payload.ENERGY.Factor" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Calculate energy consumption (difference between hours)
        let previousMaxEnergy = 0;
        const result = hourlyData.map((hourData: any, index: number) => {
            let hourlyConsumption: number;
            if (index === 0 || hourData.maxEnergy < previousMaxEnergy) {
                hourlyConsumption = hourData.maxEnergy;
            } else {
                hourlyConsumption = Math.max(0, hourData.maxEnergy - previousMaxEnergy);
            }
            previousMaxEnergy = hourData.maxEnergy;

            return {
                hour: hourData._id,
                energy: Math.round(hourlyConsumption * 100) / 100,
                peakPower: Math.round((hourData.peakPower || 0) * 100) / 100,
                voltage: Math.round((hourData.avgVoltage || 0) * 10) / 10,
                current: Math.round((hourData.avgCurrent || 0) * 1000) / 1000,
                factor: Math.round((hourData.avgFactor || 0) * 100) / 100
            };
        });

        logger.info(`Generated daily report with ${result.length} hourly data points`);
        return result;
    }

    private async generateWeeklyReport(collection: Collection, weekNum: number, year: number): Promise<any[]> {
        const weekYearStart = new Date(year, 0, 1);
        const daysToMonday = (8 - weekYearStart.getDay()) % 7;
        const weekStart = new Date(year, 0, 1 + daysToMonday + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        logger.debug('Weekly query date range:', {
            weekNum,
            year,
            start: weekStart.toISOString(),
            end: weekEnd.toISOString()
        });

        // Get daily data with optimized query (no sort by timestamp)
        const dailyData = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    "payload.timestamp": {
                        $gte: weekStart.toISOString(),
                        $lte: weekEnd.toISOString()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: "$payload.timestamp" }
                        }
                    },
                    dayOfWeek: { $first: { $dayOfWeek: { $toDate: "$payload.timestamp" } } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    avgPower: { $avg: "$payload.ENERGY.Power" },
                    peakPower: { $max: "$payload.ENERGY.Power" },
                    avgVoltage: { $avg: "$payload.ENERGY.Voltage" },
                    avgCurrent: { $avg: "$payload.ENERGY.Current" },
                    avgFactor: { $avg: "$payload.ENERGY.Factor" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray() as DailyDataPoint[];

        logger.info(`Retrieved ${dailyData.length} days for weekly report`);

        // Process data
        let previousMaxEnergy = 0;
        const result = dailyData.map((day: DailyDataPoint, index: number) => {
            let dailyConsumption: number;
            if (index === 0 || day.maxEnergy < previousMaxEnergy) {
                dailyConsumption = day.maxEnergy;
            } else {
                dailyConsumption = Math.max(0, day.maxEnergy - previousMaxEnergy);
            }
            previousMaxEnergy = day.maxEnergy;

            return {
                day: day.dayOfWeek,
                dayName: ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.dayOfWeek || 0],
                date: day._id,
                power: Math.round(day.avgPower * 100) / 100,
                peakPower: Math.round(day.peakPower * 100) / 100,
                energy: Math.round(dailyConsumption * 100) / 100,
                voltage: Math.round(day.avgVoltage * 10) / 10,
                current: Math.round(day.avgCurrent * 1000) / 1000,
                factor: Math.round(day.avgFactor * 100) / 100
            };
        });

        logger.info(`Generated weekly report with ${result.length} daily data points`);
        return result;
    }

    private async generateMonthlyReport(collection: Collection, monthNum: number, year: number): Promise<any[]> {
        const monthStart = new Date(year, monthNum - 1, 1);
        const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

        logger.debug('Monthly query date range:', {
            month: monthNum,
            year,
            start: monthStart.toISOString(),
            end: monthEnd.toISOString()
        });

        // Optimized query without timestamp sort
        const dailyData = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    "payload.timestamp": {
                        $gte: monthStart.toISOString(),
                        $lte: monthEnd.toISOString()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: "$payload.timestamp" }
                        }
                    },
                    dayOfMonth: { $first: { $dayOfMonth: { $toDate: "$payload.timestamp" } } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    avgPower: { $avg: "$payload.ENERGY.Power" },
                    peakPower: { $max: "$payload.ENERGY.Power" },
                    avgVoltage: { $avg: "$payload.ENERGY.Voltage" },
                    avgCurrent: { $avg: "$payload.ENERGY.Current" },
                    avgFactor: { $avg: "$payload.ENERGY.Factor" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray() as DailyDataPoint[];

        logger.info(`Retrieved ${dailyData.length} days for monthly report`);

        let previousMaxEnergy = 0;
        const result = dailyData.map((day: DailyDataPoint, index: number) => {
            let dailyConsumption: number;
            if (index === 0 || day.maxEnergy < previousMaxEnergy) {
                dailyConsumption = day.maxEnergy;
            } else {
                dailyConsumption = Math.max(0, day.maxEnergy - previousMaxEnergy);
            }
            previousMaxEnergy = day.maxEnergy;

            return {
                day: day.dayOfMonth,
                date: day._id,
                power: Math.round(day.avgPower * 100) / 100,
                peakPower: Math.round(day.peakPower * 100) / 100,
                energy: Math.round(dailyConsumption * 100) / 100,
                voltage: Math.round(day.avgVoltage * 10) / 10,
                current: Math.round(day.avgCurrent * 1000) / 1000,
                factor: Math.round(day.avgFactor * 100) / 100
            };
        });

        logger.info(`Generated monthly report with ${result.length} daily data points`);
        return result;
    }

    private async generateYearlyReport(collection: Collection, year: number): Promise<any[]> {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

        logger.debug('Yearly query date range:', {
            year,
            start: yearStart.toISOString(),
            end: yearEnd.toISOString()
        });

        // Optimized query without timestamp sort
        const dailyData = await collection.aggregate([
            {
                $match: {
                    "payload.ENERGY": { $exists: true },
                    "payload.timestamp": {
                        $gte: yearStart.toISOString(),
                        $lte: yearEnd.toISOString()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: "$payload.timestamp" }
                        }
                    },
                    month: { $first: { $month: { $toDate: "$payload.timestamp" } } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    avgPower: { $avg: "$payload.ENERGY.Power" },
                    peakPower: { $max: "$payload.ENERGY.Power" },
                    avgVoltage: { $avg: "$payload.ENERGY.Voltage" },
                    avgCurrent: { $avg: "$payload.ENERGY.Current" },
                    avgFactor: { $avg: "$payload.ENERGY.Factor" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray() as DailyDataPoint[];

        logger.info(`Retrieved ${dailyData.length} days for yearly report`);

        // Process daily data into monthly aggregates
        const monthlyData: { [key: string]: {
                totalEnergy: number;
                powerSum: number;
                powerCount: number;
                peakPower: number;
            }} = {};

        let previousMaxEnergy = 0;

        dailyData.forEach((day: DailyDataPoint, index: number) => {
            let dailyConsumption: number;
            if (index === 0 || day.maxEnergy < previousMaxEnergy) {
                dailyConsumption = day.maxEnergy;
            } else {
                dailyConsumption = Math.max(0, day.maxEnergy - previousMaxEnergy);
            }
            previousMaxEnergy = day.maxEnergy;

            const monthKey = String(day.month || 0);
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    totalEnergy: 0,
                    powerSum: 0,
                    powerCount: 0,
                    peakPower: 0
                };
            }

            monthlyData[monthKey].totalEnergy += dailyConsumption;
            monthlyData[monthKey].powerSum += day.avgPower || 0;
            monthlyData[monthKey].powerCount++;
            monthlyData[monthKey].peakPower = Math.max(
                monthlyData[monthKey].peakPower,
                day.peakPower || 0
            );
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const result = Object.keys(monthlyData).map(month => {
            const monthDays = dailyData.filter(day => day.month === parseInt(month));
            const avgVoltage = monthDays.reduce((sum, day) => sum + (day.avgVoltage || 0), 0) /
                monthDays.filter(day => day.avgVoltage !== undefined).length;
            const avgCurrent = monthDays.reduce((sum, day) => sum + (day.avgCurrent || 0), 0) /
                monthDays.filter(day => day.avgCurrent !== undefined).length;
            const avgFactor = monthDays.reduce((sum, day) => sum + (day.avgFactor || 0), 0) /
                monthDays.filter(day => day.avgFactor !== undefined).length;

            return {
                month: parseInt(month),
                monthName: monthNames[parseInt(month) - 1],
                power: Math.round((monthlyData[month].powerSum / monthlyData[month].powerCount) * 100) / 100,
                peakPower: Math.round(monthlyData[month].peakPower * 100) / 100,
                energy: Math.round(monthlyData[month].totalEnergy * 100) / 100,
                voltage: Math.round(avgVoltage * 10) / 10,
                current: Math.round(avgCurrent * 1000) / 1000,
                factor: Math.round(avgFactor * 100) / 100
            };
        }).sort((a, b) => a.month - b.month);


        logger.info(`Generated yearly report with ${result.length} monthly data points`);
        return result;
    }
}

export default new ReportService();
