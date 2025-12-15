interface CacheItem<T> {
    data: T;
    expiry: number;
}

class CacheService {
    private cache = new Map<string, CacheItem<any>>();
    private defaultTTL = 15 * 60 * 1000;

    get<T>(key: string): T | null {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        if (item.expiry <= Date.now()) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    set<T>(key: string, data: T, ttl = this.defaultTTL): void {
        this.cache.set(key, { data, expiry: Date.now() + ttl });
    }

    invalidate(pattern: string): void {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    cleanup(): void {
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (item.expiry <= now) {
                this.cache.delete(key);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

export default new CacheService();
