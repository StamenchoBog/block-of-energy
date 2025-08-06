import { Request, Response } from 'express';
import reportService from '../services/reportService';
import cacheService from '../services/cacheService';
import logger from '../config/logger';
import { ReportResponse } from '../models/energy';

export const getReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'daily', date, week, month, year } = req.query;

        // Create cache key from query parameters
        const cacheKey = `report:${type}:${date || ''}:${week || ''}:${month || ''}:${year || ''}`;

        // Check cache first
        const cachedData = cacheService.get<ReportResponse>(cacheKey);
        if (cachedData) {
            logger.info(`Serving cached ${type} report`);
            res.json(cachedData);
            return;
        }

        // Generate report
        const reportParams = {
            type: String(type),
            date: date as string,
            week: week ? String(week) : undefined,
            month: month ? String(month) : undefined,
            year: year ? String(year) : undefined
        };
        const report = await reportService.generateReport(reportParams);

        // Cache the result (adjust TTL based on report type)
        const ttl = reportParams.type === 'daily' ? 15 * 60 * 1000 : 60 * 60 * 1000;
        cacheService.set(cacheKey, report, ttl);

        res.json(report);
    } catch (error) {
        logger.error('Error in report controller:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export const downloadReportCSV = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'daily', date, week, month, year } = req.query;
        // Generate report using the same logic as getReport
        const reportParams = {
            type: String(type),
            date: date as string,
            week: week ? String(week) : undefined,
            month: month ? String(month) : undefined,
            year: year ? String(year) : undefined
        };

        // Reuse the existing report generation logic
        const report = await reportService.generateReport(reportParams);

        // Convert report data to CSV
        const convertToCSV = (data: any[]) => {
            if (!data || data.length === 0) return '';

            // Get headers from first object
            const headers = Object.keys(data[0]);

            // Create friendly header names
            const friendlyHeaders = headers.map(header => {
                switch (header) {
                    case 'peakPower': return 'Peak Power (W)';
                    case 'energy': return 'Energy (kWh)';
                    case 'voltage': return 'Voltage (V)';
                    case 'current': return 'Current (A)';
                    case 'factor': return 'Power Factor';
                    case 'hour': return 'Time';
                    default: return header.charAt(0).toUpperCase() + header.slice(1);
                }
            });

            // Create CSV header row
            const headerRow = friendlyHeaders.join(',');

            // Format time values (hour -> HH:00)
            const formatValue = (header: string, value: any) => {
                if (header === 'hour' && typeof value === 'number') {
                    return `${String(value).padStart(2, '0')}:00`;
                }
                return value;
            };

            // Create data rows
            const rows = data.map(row => {
                return headers.map(header => {
                    const value = formatValue(header, row[header]);
                    const valueStr = value === null || value === undefined ? '' : String(value);

                    // Escape quotes and wrap in quotes if needed
                    if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
                        return `"${valueStr.replace(/"/g, '""')}"`;
                    }
                    return valueStr;
                }).join(',');
            }).join('\n');

            return `${headerRow}\n${rows}`;
        };

        // Generate appropriate filename
        const getFilename = () => {
            const timestamp = new Date().toISOString().split('T')[0];
            switch(String(type)) {
                case 'daily': return `daily_report_${date || timestamp}.csv`;
                case 'weekly': return `weekly_report_${week || 'current'}.csv`;
                case 'monthly': return `monthly_report_${month || 'current'}_${year || new Date().getFullYear()}.csv`;
                case 'yearly': return `yearly_report_${year || new Date().getFullYear()}.csv`;
                default: return `energy_report_${timestamp}.csv`;
            }
        };

        const csvData = convertToCSV(report.data);
        const filename = getFilename();

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Send CSV data
        res.send(csvData);
        logger.info(`CSV report downloaded: ${filename}`);
    } catch (error) {
        logger.error('Error generating CSV report:', error);
        res.status(500).json({ error: 'Failed to generate CSV report' });
    }
};

export const invalidateCache = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pattern = 'report:*' } = req.body;
        cacheService.invalidate(pattern);
        logger.info(`Cache invalidated with pattern: ${pattern}`);
        res.json({ success: true, message: 'Cache invalidated' });
    } catch (error) {
        logger.error('Error invalidating cache:', error);
        res.status(500).json({ error: 'Failed to invalidate cache' });
    }
};
