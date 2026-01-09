interface CacheItem<T> {
    data: T;
    expiry: number;
    staleExpiry: number;
    lastAccessed: number;
    size: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    staleHits: number;
    evictions: number;
    totalEntries: number;
    memoryUsageBytes: number;
}

export type CacheGetResult<T> = {
    data: T;
    isStale: boolean;
} | null;

class CacheService {
    private cache = new Map<string, CacheItem<any>>();
    private defaultTTL = 15 * 60 * 1000;
    private staleTTLMultiplier = 2;
    private maxEntries = 500;
    private maxMemoryBytes = 50 * 1024 * 1024;
    private currentMemoryBytes = 0;

    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        staleHits: 0,
        evictions: 0,
        totalEntries: 0,
        memoryUsageBytes: 0
    };

    get<T>(key: string): CacheGetResult<T> {
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return null;
        }

        const now = Date.now();

        if (now > item.staleExpiry) {
            this.cache.delete(key);
            this.currentMemoryBytes -= item.size;
            this.stats.misses++;
            return null;
        }

        item.lastAccessed = now;

        if (now <= item.expiry) {
            this.stats.hits++;
            return { data: item.data as T, isStale: false };
        }

        this.stats.staleHits++;
        return { data: item.data as T, isStale: true };
    }

    getData<T>(key: string): T | null {
        const result = this.get<T>(key);
        return result ? result.data : null;
    }

    set<T>(key: string, data: T, ttl = this.defaultTTL): void {
        const now = Date.now();
        const size = this.estimateSize(data);

        this.evictIfNeeded(size);

        const existing = this.cache.get(key);
        if (existing) {
            this.currentMemoryBytes -= existing.size;
        }

        this.cache.set(key, {
            data,
            expiry: now + ttl,
            staleExpiry: now + (ttl * this.staleTTLMultiplier),
            lastAccessed: now,
            size
        });

        this.currentMemoryBytes += size;
        this.updateStats();
    }

    private evictIfNeeded(incomingSize: number): void {
        const needsEviction =
            this.cache.size >= this.maxEntries ||
            (this.currentMemoryBytes + incomingSize) > this.maxMemoryBytes;

        if (!needsEviction) {
            return;
        }

        this.cleanup();

        if (this.cache.size < this.maxEntries &&
            (this.currentMemoryBytes + incomingSize) <= this.maxMemoryBytes) {
            return;
        }

        // LRU + TTL-aware eviction: score = time since access + proximity to expiry
        const now = Date.now();
        const scored = Array.from(this.cache.entries()).map(([key, item]) => ({
            key,
            item,
            score: (now - item.lastAccessed) + Math.max(0, item.expiry - now)
        }));

        scored.sort((a, b) => b.score - a.score);

        const targetMemory = this.maxMemoryBytes * 0.8;
        const targetEntries = this.maxEntries * 0.8;

        for (const { key, item } of scored) {
            if (this.cache.size <= targetEntries &&
                (this.currentMemoryBytes + incomingSize) <= targetMemory) {
                break;
            }

            this.cache.delete(key);
            this.currentMemoryBytes -= item.size;
            this.stats.evictions++;
        }

        this.updateStats();
    }

    invalidate(pattern: string): void {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));

        for (const [key, item] of this.cache.entries()) {
            if (regex.test(key)) {
                this.currentMemoryBytes -= item.size;
                this.cache.delete(key);
            }
        }
        this.updateStats();
    }

    cleanup(): void {
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (item.staleExpiry <= now) {
                this.currentMemoryBytes -= item.size;
                this.cache.delete(key);
            }
        }
        this.updateStats();
    }

    clear(): void {
        this.cache.clear();
        this.currentMemoryBytes = 0;
        this.updateStats();
    }

    size(): number {
        return this.cache.size;
    }

    getStats(): CacheStats {
        return { ...this.stats };
    }

    getHitRate(): number {
        const total = this.stats.hits + this.stats.misses + this.stats.staleHits;
        if (total === 0) return 0;
        return ((this.stats.hits + this.stats.staleHits) / total) * 100;
    }

    private updateStats(): void {
        this.stats.totalEntries = this.cache.size;
        this.stats.memoryUsageBytes = this.currentMemoryBytes;
    }

    private estimateSize(data: unknown): number {
        try {
            return JSON.stringify(data).length * 2;
        } catch {
            return 1024;
        }
    }
}

export default new CacheService();