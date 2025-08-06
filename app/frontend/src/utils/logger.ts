type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
    tags?: string[];
    data?: Record<string, any>;
}

export const logger = {
    debug(message: string, options?: LogOptions): void {
        this.log('debug', message, options);
    },

    info(message: string, options?: LogOptions): void {
        this.log('info', message, options);
    },

    warn(message: string, options?: LogOptions): void {
        this.log('warn', message, options);
    },

    error(message: string, error?: Error, options?: LogOptions): void {
        const opts = options || {};
        const data = opts.data || {};

        if (error) {
            data.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        this.log('error', message, { ...opts, data });
    },

    log(level: LogLevel, message: string, options?: LogOptions): void {
        if (import.meta.env.DEV || level === 'error' || level === 'warn') {
            const { tags = [], data = {} } = options || {};
            const tagStr = tags.length ? `[${tags.join(',')}]` : '';

            console[level](`[${level.toUpperCase()}]${tagStr} ${message}`,
                Object.keys(data).length ? data : '');
        }

        // Here you could add remote logging service integration
    }
};
