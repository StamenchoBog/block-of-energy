import { memo } from 'react';

// Card skeleton - used for metric cards
export const CardSkeleton = memo(({ count = 1, className = '' }) => (
    <>
        {[...Array(count)].map((_, i) => (
            <div key={i} className={`metric-card animate-pulse ${className}`}>
                <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
        ))}
    </>
));

CardSkeleton.displayName = 'CardSkeleton';

// Chart skeleton - used for chart components
export const ChartSkeleton = memo(({ withSubtitle = false, height = 'h-80', className = '' }) => (
    <div className={`animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            {withSubtitle && <div className="h-4 bg-gray-200 rounded w-24"></div>}
        </div>
        <div className={`h-80 bg-gray-200 rounded-lg ${height}`}></div>
    </div>
));

ChartSkeleton.displayName = 'ChartSkeleton';

// Table skeleton - used for reports and data tables
export const TableSkeleton = memo(({ rows = 5, className = '' }) => (
    <div className={`space-y-3 animate-pulse ${className}`}>
        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded"></div>
        ))}
    </div>
));

TableSkeleton.displayName = 'TableSkeleton';

// Combined loading state - used in DashboardContent
export const DashboardSkeleton = memo(() => (
    <>
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <CardSkeleton count={4} />
        </div>
        
        {/* Chart skeleton */}
        <div className="metric-card mb-8">
            <ChartSkeleton withSubtitle={true} />
        </div>
    </>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

// Report skeleton - used in ReportsContainer
export const ReportSkeleton = memo(() => (
    <div className="p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
        <TableSkeleton rows={5} />
    </div>
));

ReportSkeleton.displayName = 'ReportSkeleton';

// Anomaly panel skeleton - used in AnomalyPanel
export const AnomalySkeleton = memo(() => (
    <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
    </div>
));

AnomalySkeleton.displayName = 'AnomalySkeleton';