import logger from '../config/logger';

interface CacheItem<T> {
    data: T;
    expiry: number;
}

class CacheService {
    private cache = new Map<string, CacheItem<any>>();
    private defaultTTL = 15 * 60 * 1000; // 15 minutes in milliseconds

    get<T>(key: string): T | null {
        const now = Date.now();
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        if (item.expiry <= now) {
            this.cache.delete(key);
            logger.debug(`Cache expired for key: ${key}`);
            return null;
        }

        logger.debug(`Cache hit for key: ${key}`);
        return item.data as T;
    }

    set<T>(key: string, data: T, ttl = this.defaultTTL): void {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { data, expiry });
        logger.debug(`Cache set for key: ${key}, expires in ${ttl/1000} seconds`);
    }

    invalidate(pattern: string): void {
        const regex = new RegExp(pattern.replace('*', '.*'));
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        logger.info(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
    }

    // Clean expired entries (call periodically)
    cleanup(): void {
        const now = Date.now();
        let count = 0;

        for (const [key, item] of this.cache.entries()) {
            if (item.expiry <= now) {
                this.cache.delete(key);
                count++;
            }
        }

        if (count > 0) {
            logger.debug(`Cleaned up ${count} expired cache entries`);
        }
    }
}

export default new CacheService();
