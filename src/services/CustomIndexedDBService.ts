import type { DecryptedDataCachingHandlerInterface } from '@binsky/passman-client-ts/lib/Interfaces/DecryptedDataCachingHandlerInterface';

export class CustomIndexedDBService implements DecryptedDataCachingHandlerInterface {
    private static instance: CustomIndexedDBService | null = null;
    private cache: Map<string, Map<string, string | number | boolean | null>>;

    constructor() {
        this.cache = new Map();
    }

    public static getInstance(): CustomIndexedDBService {
        if (!CustomIndexedDBService.instance) {
            CustomIndexedDBService.instance = new CustomIndexedDBService();
        }
        return CustomIndexedDBService.instance;
    }

    private getOrCreateCacheMap(cacheName: string): Map<string, string | number | boolean | null> {
        let cacheMap = this.cache.get(cacheName);
        if (!cacheMap) {
            cacheMap = new Map();
            this.cache.set(cacheName, cacheMap);
        }
        return cacheMap;
    }

    async set(cacheName: string, key: string, value: string | number | boolean | null | undefined): Promise<void> {
        const cacheMap = this.getOrCreateCacheMap(cacheName);
        
        if (value === undefined) {
            // Delete the key if value is undefined
            cacheMap.delete(key);
            // Remove the cache map if it's empty
            if (cacheMap.size === 0) {
                this.cache.delete(cacheName);
            }
        } else {
            cacheMap.set(key, value);
        }
    }

    async get(cacheName: string, key: string): Promise<string | number | boolean | null | undefined> {
        const cacheMap = this.cache.get(cacheName);
        if (!cacheMap) {
            return undefined;
        }
        console.log('get from cacheMap', cacheMap);
        return cacheMap.has(key) ? cacheMap.get(key) : undefined;
    }

    async clearCacheByName(cacheName: string): Promise<void> {
        this.cache.delete(cacheName);
    }

    // Additional utility method to clear all data (useful for testing)
    clear(): void {
        this.cache.clear();
    }
}

// Export a singleton instance
export const customIndexedDBService = CustomIndexedDBService.getInstance();
export default customIndexedDBService;
