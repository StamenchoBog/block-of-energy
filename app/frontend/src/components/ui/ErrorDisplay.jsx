import { memo } from 'react';

// Generic error display with retry functionality
export const ErrorDisplay = memo(({ 
    error, 
    onRetry, 
    title = 'Unable to Load Data',
    description,
    iconColor = 'text-red-500',
    bgColor = 'bg-red-100',
    showRetry = true,
    className = ''
}) => (
    <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full ${bgColor} flex items-center justify-center">
            <svg className={`w-8 h-8 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">
            {description || error || 'Something went wrong. Please try again.'}
        </p>
        {showRetry && onRetry && (
            <button 
                onClick={onRetry} 
                className="btn-modern primary"
            >
                Try Again
            </button>
        )}
    </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// Simple inline error for smaller spaces
export const InlineError = memo(({ error, className = '' }) => (
    <div className={`error-message ${className}`}>
        {error || 'An error occurred'}
    </div>
));

InlineError.displayName = 'InlineError';

// No data state with contextual messages
export const NoDataState = memo(({ 
    title = 'No Data Available', 
    description,
    iconColor = 'text-gray-400',
    bgColor = 'bg-gray-100',
    className = ''
}) => (
    <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full ${bgColor} flex items-center justify-center">
            <svg className={`w-8 h-8 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-500 text-center max-w-md mx-auto">
            {description || 'Data will appear here once available.'}
        </p>
    </div>
));

NoDataState.displayName = 'NoDataState';

// Empty table state
export const EmptyTableState = memo(({ message = 'No data available' }) => (
    <div className="p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
    </div>
));

EmptyTableState.displayName = 'EmptyTableState';

// Success state
export const SuccessState = memo(({ 
    title = 'Success!', 
    description,
    className = ''
}) => (
    <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-500 text-center max-w-sm">
            {description || 'Operation completed successfully.'}
        </p>
    </div>
));

SuccessState.displayName = 'SuccessState';