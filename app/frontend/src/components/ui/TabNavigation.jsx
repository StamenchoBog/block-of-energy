import { memo } from 'react';

/**
 * Reusable tab navigation component
 * @param {Array} tabs - Array of { id, label, icon?, badge? }
 * @param {string} activeTab - Currently active tab id
 * @param {function} onChange - Callback when tab changes
 * @param {string} variant - 'pill' (default) or 'underline'
 * @param {string} size - 'sm', 'md' (default), or 'lg'
 */
const TabNavigation = memo(function TabNavigation({
    tabs,
    activeTab,
    onChange,
    variant = 'pill',
    size = 'md'
}) {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base'
    };

    if (variant === 'underline') {
        return (
            <div className="flex items-center space-x-1 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center ${sizeClasses[size]} font-medium border-b-2 -mb-px transition-colors duration-200
                            ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // Default: pill variant
    return (
        <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`flex items-center ${sizeClasses[size]} font-medium rounded-lg transition-all duration-200
                        ${activeTab === tab.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'}
                    `}
                >
                    {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
});

export default TabNavigation;