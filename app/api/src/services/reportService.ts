import { Collection } from 'mongodb';
import {
    startOfISOWeek,
    endOfISOWeek,
    setISOWeek,
    setISOWeekYear,
    getISOWeeksInYear,
    format,
    subDays
} from 'date-fns';
import logger from '../config/logger';
import {
    DailyDataPoint,
    ReportParams,
    ReportResponse,
    ReportSummary,
    PeriodComparison,
    DeviceBreakdown
} from '../models/energy';
import { getDatabase } from "../config/database";
import { getCostService } from './costService';
import cacheService from './cacheService';

const REPORT_CACHE_TTL = {
    daily: 5 * 60 * 1000,     // 5 minutes - data changes throughout day
    weekly: 15 * 60 * 1000,   // 15 minutes - less frequent updates
    monthly: 30 * 60 * 1000,  // 30 minutes - historical data
    yearly: 60 * 60 * 1000    // 1 hour - mostly static
} as const;

export class ReportService {
    // Memoization cache for expensive ISO week boundary calculations
    private weekBoundaryCache = new Map<string, { start: Date; end: Date }>();

    /**
     * Builds a cache key for the given report type and parameters
     */
    private buildCacheKey(reportType: string, params: ReportParams): string {
        const { date, week, month, year } = params;
        const currentYear = year || new Date().getFullYear();

        switch (reportType) {
            case 'daily':
                return `reports:daily:${date || new Date().toISOString().split('T')[0]}`;
            case 'weekly':
                return `reports:weekly:${currentYear}:${week}`;
            case 'monthly':
                return `reports:monthly:${currentYear}:${month}`;
            case 'yearly':
                return `reports:yearly:${currentYear}`;
            default:
                return `reports:${reportType}:${JSON.stringify(params)}`;
        }
    }

    /**
     * Get ISO week boundaries with memoization to avoid repeated expensive calculations
     */
    private getWeekBoundaries(weekNum: number, year: number): { start: Date; end: Date } {
        const cacheKey = `${year}-W${weekNum}`;

        const cached = this.weekBoundaryCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const dateInWeek = setISOWeek(setISOWeekYear(new Date(), year), weekNum);
        const weekStartLocal = startOfISOWeek(dateInWeek);
        const weekEndLocal = endOfISOWeek(dateInWeek);
        const weekStartStr = format(weekStartLocal, 'yyyy-MM-dd');
        const weekEndStr = format(weekEndLocal, 'yyyy-MM-dd');

        const boundaries = {
            start: new Date(`${weekStartStr}T00:00:00.000Z`),
            end: new Date(`${weekEndStr}T23:59:59.999Z`)
        };

        this.weekBoundaryCache.set(cacheKey, boundaries);
        return boundaries;
    }

    async generateReport(params: ReportParams): Promise<ReportResponse> {
        const { type = 'daily', date, week, month, year } = params;
        const reportType = String(type).toLowerCase();
        const currentYear = year || new Date().getFullYear();

        // Check cache first
        const cacheKey = this.buildCacheKey(reportType, params);
        const cached = cacheService.getData<ReportResponse>(cacheKey);
        if (cached) {
            logger.debug(`Cache hit for ${cacheKey}`);
            return cached;
        }

        const db = await getDatabase();
        const collection = db.collection('sensor-measurements');

        logger.info(`Generating ${reportType} report (cache miss)`, { params });

        try {
            // Calculate date range ONCE and reuse for all operations
            const { startDate, endDate } = this.getDateRange(reportType, params);

            const reportData = await this.fetchReportDataWithRange(
                collection, reportType, params, startDate, endDate
            );
            const summary = this.calculateSummary(reportData);

            // Get previous period comparison
            const previousParams = this.getPreviousPeriodParams(reportType, params);
            if (previousParams) {
                try {
                    const { startDate: prevStart, endDate: prevEnd } = this.getDateRange(reportType, previousParams);
                    const previousData = await this.fetchReportDataWithRange(
                        collection, reportType, previousParams, prevStart, prevEnd
                    );
                    if (previousData.length > 0) {
                        const previousSummary = this.calculateSummary(previousData);
                        summary.comparison = this.calculateComparison(summary, previousSummary, reportType);
                    }
                } catch (err) {
                    logger.warn('Failed to fetch previous period data:', err);
                }
            }

            // Reuse already-calculated date range for device breakdown
            const deviceBreakdown = await this.getDeviceBreakdown(collection, startDate, endDate);

            const response: ReportResponse = {
                reportType,
                date: date || new Date().toISOString().split('T')[0],
                week,
                month,
                year: currentYear,
                data: reportData,
                summary,
                deviceBreakdown: deviceBreakdown.length > 0 ? deviceBreakdown : undefined
            };

            // Cache the result with appropriate TTL
            const ttl = REPORT_CACHE_TTL[reportType as keyof typeof REPORT_CACHE_TTL]
                || REPORT_CACHE_TTL.daily;
            cacheService.set(cacheKey, response, ttl);

            return response;
        } catch (error) {
            logger.error(`Error generating ${reportType} report:`, error);
            throw error;
        }
    }

    private async fetchReportDataWithRange(
        collection: Collection,
        reportType: string,
        params: ReportParams,
        startDate: Date,
        endDate: Date
    ): Promise<any[]> {
        const { date, year } = params;
        const currentYear = year || new Date().getFullYear();

        switch (reportType) {
            case 'daily':
                return this.generateDailyReport(collection, date);
            case 'weekly':
                return this.generateWeeklyReport(collection, startDate, endDate);
            case 'monthly':
                return this.generateMonthlyReport(collection, startDate, endDate);
            case 'yearly':
                return this.generateYearlyReport(collection, Number(currentYear));
            default:
                throw new Error(`Invalid report type: ${reportType}`);
        }
    }

    private async generateDailyReport(collection: Collection, date?: string): Promise<any[]> {
        const dailyDate = date ? String(date) : new Date().toISOString().split('T')[0];
        const { startDate, endDate } = this.createDateRange(dailyDate);
        const timestampExpr = { $ifNull: ["$payload.timestamp", "$processingTimestamp"] };

        const hourlyData = await collection.aggregate([
            { $match: this.createMatchStage(startDate, endDate) },
            {
                $group: {
                    _id: { $hour: { $toDate: timestampExpr } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    peakPower: { $max: "$payload.ENERGY.Power" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        const costService = getCostService();
        return this.processConsumptionData(hourlyData, (item, energy) => {
            const timestamp = new Date(`${dailyDate}T${String(item._id).padStart(2, '0')}:00:00`);
            const cost = costService.calculateReadingCost(energy, timestamp);
            return {
                hour: item._id,
                energy,
                peakPower: Math.round((item.peakPower || 0) * 100) / 100,
                cost: cost.cost,
                tariffType: cost.tariffType
            };
        });
    }

    private async generateWeeklyReport(
        collection: Collection,
        weekStart: Date,
        weekEnd: Date
    ): Promise<any[]> {
        const dailyData = await this.aggregateByDay(collection, weekStart, weekEnd);
        const costService = getCostService();
        const dataByDate = new Map(dailyData.map(day => [day._id, day]));
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const results: any[] = [];

        // Simple arithmetic loop instead of eachDayOfInterval
        const startMs = weekStart.getTime();
        const dayMs = 24 * 60 * 60 * 1000;

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startMs + i * dayMs);
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const isoDay = i + 1; // 1=Mon through 7=Sun (ISO standard)
            const dayData = dataByDate.get(dateStr);

            if (dayData) {
                const energy = Math.round((dayData.maxEnergy || 0) * 100) / 100;
                const cost = costService.calculateReadingCost(energy, new Date(`${dateStr}T12:00:00`));
                results.push({
                    day: isoDay,
                    dayName: dayNames[i],
                    date: dateStr,
                    peakPower: Math.round((dayData.peakPower || 0) * 100) / 100,
                    energy,
                    cost: cost.cost
                });
            } else {
                results.push({
                    day: isoDay,
                    dayName: dayNames[i],
                    date: dateStr,
                    peakPower: null,
                    energy: null,
                    cost: null
                });
            }
        }

        return results;
    }

    private async generateMonthlyReport(
        collection: Collection,
        monthStart: Date,
        monthEnd: Date
    ): Promise<any[]> {
        const dailyData = await this.aggregateByDay(collection, monthStart, monthEnd);
        const costService = getCostService();

        return dailyData.map(day => {
            const energy = Math.round((day.maxEnergy || 0) * 100) / 100;
            const cost = costService.calculateReadingCost(energy, new Date(`${day._id}T12:00:00`));
            return {
                day: day.dayOfMonth,
                date: day._id,
                peakPower: Math.round((day.peakPower || 0) * 100) / 100,
                energy,
                cost: cost.cost
            };
        });
    }

    private async generateYearlyReport(collection: Collection, year: number): Promise<any[]> {
        // Use explicit UTC dates
        const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
        const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

        const dailyData = await this.aggregateByDay(collection, yearStart, yearEnd) as DailyDataPoint[];
        const costService = getCostService();

        // Aggregate daily data into monthly
        // Each day's MAX(ENERGY.Today) IS the daily consumption (meter resets at midnight)
        const monthlyData: Record<number, { energy: number; cost: number; peakPower: number }> = {};

        dailyData.forEach((day) => {
            const energy = day.maxEnergy || 0;
            const monthKey = day.month || 1;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { energy: 0, cost: 0, peakPower: 0 };
            }

            const cost = costService.calculateReadingCost(energy, new Date(`${day._id}T12:00:00`));
            monthlyData[monthKey].energy += energy;
            monthlyData[monthKey].cost += cost.cost;
            monthlyData[monthKey].peakPower = Math.max(monthlyData[monthKey].peakPower, day.peakPower || 0);
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return Object.entries(monthlyData)
            .map(([month, data]) => ({
                month: Number(month),
                monthName: monthNames[Number(month) - 1],
                peakPower: Math.round(data.peakPower * 100) / 100,
                energy: Math.round(data.energy * 100) / 100,
                cost: Math.round(data.cost * 100) / 100
            }))
            .sort((a, b) => a.month - b.month);
    }

    private createMatchStage(startDate: Date, endDate: Date) {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        return {
            "payload.ENERGY": { $exists: true },
            $or: [
                { "payload.timestamp": { $gte: startISO, $lte: endISO } },
                {
                    "payload.timestamp": { $exists: false },
                    "processingTimestamp": { $gte: startISO, $lte: endISO }
                }
            ]
        };
    }

    // Helper: Create date range from date string
    private createDateRange(dateStr: string): { startDate: Date; endDate: Date } {
        return {
            startDate: new Date(`${dateStr}T00:00:00.000Z`),
            endDate: new Date(`${dateStr}T23:59:59.999Z`)
        };
    }

    // Helper: Aggregate data by day
    private async aggregateByDay(collection: Collection, startDate: Date, endDate: Date): Promise<DailyDataPoint[]> {
        const timestampExpr = { $ifNull: ["$payload.timestamp", "$processingTimestamp"] };

        return collection.aggregate([
            { $match: this.createMatchStage(startDate, endDate) },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: timestampExpr } } },
                    dayOfWeek: { $first: { $dayOfWeek: { $toDate: timestampExpr } } },
                    dayOfMonth: { $first: { $dayOfMonth: { $toDate: timestampExpr } } },
                    month: { $first: { $month: { $toDate: timestampExpr } } },
                    maxEnergy: { $max: "$payload.ENERGY.Today" },
                    peakPower: { $max: "$payload.ENERGY.Power" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray() as Promise<DailyDataPoint[]>;
    }

    // Helper: Calculate consumption difference
    private calculateConsumption(current: number, previous: number, index: number): number {
        if (index === 0 || current < previous) return current;
        return Math.max(0, current - previous);
    }

    // Helper: Process consumption data with custom mapper
    private processConsumptionData<T>(data: any[], mapper: (item: any, energy: number) => T): T[] {
        let previousMaxEnergy = 0;
        return data.map((item, index) => {
            const consumption = this.calculateConsumption(item.maxEnergy, previousMaxEnergy, index);
            previousMaxEnergy = item.maxEnergy;
            const energy = Math.round(consumption * 100) / 100;
            return mapper(item, energy);
        });
    }

    private calculateSummary(reportData: any[]): ReportSummary & { totalCost?: number; currency?: string } {
        if (!reportData || reportData.length === 0) {
            return { totalEnergy: 0, peakPower: 0 };
        }

        const totalEnergy = reportData.reduce((sum, item) => sum + (item.energy || 0), 0);
        const totalCost = reportData.reduce((sum, item) => sum + (item.cost || 0), 0);
        const peakPower = Math.max(...reportData.map(item => item.peakPower || 0));
        const costService = getCostService();

        return {
            totalEnergy: Math.round(totalEnergy * 100) / 100,
            peakPower: Math.round(peakPower * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            currency: costService.getTariffConfig().currency
        };
    }

    private getPreviousPeriodParams(reportType: string, params: ReportParams): ReportParams | null {
        const { date, week, month, year } = params;

        switch (reportType) {
            case 'daily': {
                if (!date) return null;
                const prevDate = subDays(new Date(date), 1);
                return { type: 'daily', date: format(prevDate, 'yyyy-MM-dd') };
            }
            case 'weekly': {
                if (!week || !year) return null;
                const w = Number(week), y = Number(year);
                if (w > 1) {
                    return { type: 'weekly', week: w - 1, year: y };
                }
                // Week 1 → last week of previous year (could be 52 or 53)
                const lastWeekOfPrevYear = getISOWeeksInYear(new Date(y - 1, 6, 1));
                return { type: 'weekly', week: lastWeekOfPrevYear, year: y - 1 };
            }
            case 'monthly': {
                if (!month || !year) return null;
                const m = Number(month), y = Number(year);
                return m > 1 ? { type: 'monthly', month: m - 1, year: y } : { type: 'monthly', month: 12, year: y - 1 };
            }
            case 'yearly': {
                if (!year) return null;
                return { type: 'yearly', year: Number(year) - 1 };
            }
            default:
                return null;
        }
    }

    private calculateComparison(current: ReportSummary, previous: ReportSummary, reportType: string): PeriodComparison {
        const calcChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 1000) / 10;
        };

        const labels: Record<string, string> = {
            daily: 'vs yesterday', weekly: 'vs last week',
            monthly: 'vs last month', yearly: 'vs last year'
        };

        return {
            previousPeriod: {
                totalEnergy: previous.totalEnergy,
                peakPower: previous.peakPower
            },
            changes: {
                energyChange: calcChange(current.totalEnergy, previous.totalEnergy),
                peakPowerChange: calcChange(current.peakPower, previous.peakPower)
            },
            label: labels[reportType] || 'vs previous period'
        };
    }

    private async getDeviceBreakdown(collection: Collection, startDate: Date, endDate: Date): Promise<DeviceBreakdown[]> {
        try {
            const timestampExpr = { $ifNull: ["$payload.timestamp", "$processingTimestamp"] };

            // First group by device AND day to get daily consumption per device
            // Then sum up all days per device for total consumption
            const deviceData = await collection.aggregate([
                { $match: this.createMatchStage(startDate, endDate) },
                {
                    // Step 1: Get MAX(ENERGY.Today) per device per day
                    $group: {
                        _id: {
                            deviceId: "$deviceId",
                            date: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: timestampExpr } } }
                        },
                        dailyEnergy: { $max: "$payload.ENERGY.Today" },
                        peakPower: { $max: "$payload.ENERGY.Power" }
                    }
                },
                {
                    // Step 2: Sum daily consumption per device
                    $group: {
                        _id: "$_id.deviceId",
                        totalEnergy: { $sum: "$dailyEnergy" },
                        peakPower: { $max: "$peakPower" }
                    }
                },
                { $sort: { totalEnergy: -1 } }
            ]).toArray();

            if (deviceData.length <= 1) return [];

            const totalEnergy = deviceData.reduce((sum, d) => sum + (d.totalEnergy || 0), 0);
            return deviceData.map(device => ({
                deviceId: device._id || 'unknown',
                totalEnergy: Math.round((device.totalEnergy || 0) * 100) / 100,
                percentage: totalEnergy > 0 ? Math.round((device.totalEnergy / totalEnergy) * 1000) / 10 : 0,
                peakPower: Math.round((device.peakPower || 0) * 100) / 100
            }));
        } catch (error) {
            logger.warn('Failed to get device breakdown:', error);
            return [];
        }
    }

    private getDateRange(reportType: string, params: ReportParams): { startDate: Date; endDate: Date } {
        const { date, week, month, year } = params;
        const currentYear = Number(year) || new Date().getFullYear();

        switch (reportType) {
            case 'daily': {
                const d = date ? String(date) : new Date().toISOString().split('T')[0];
                return this.createDateRange(d);
            }
            case 'weekly': {
                const boundaries = this.getWeekBoundaries(Number(week) || 1, currentYear);
                return { startDate: boundaries.start, endDate: boundaries.end };
            }
            case 'monthly': {
                const m = Number(month) || 1;
                const monthStartLocal = new Date(currentYear, m - 1, 1);
                const monthEndLocal = new Date(currentYear, m, 0);
                return {
                    startDate: new Date(`${format(monthStartLocal, 'yyyy-MM-dd')}T00:00:00.000Z`),
                    endDate: new Date(`${format(monthEndLocal, 'yyyy-MM-dd')}T23:59:59.999Z`)
                };
            }
            case 'yearly':
                return {
                    startDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    endDate: new Date(`${currentYear}-12-31T23:59:59.999Z`)
                };
            default: {
                const today = new Date().toISOString().split('T')[0];
                return this.createDateRange(today);
            }
        }
    }
}

export default new ReportService();