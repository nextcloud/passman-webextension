import { onMessage } from "../messaging";
import CustomStorageService from "~/services/CustomStorageService";
import type { OfflineCacheStorageBackend } from "~/services/OfflineCacheStorageService";
import OfflineCacheStorageService from "~/services/OfflineCacheStorageService";
import { logger } from "~/services/ConsoleLoggingService";

export interface RecreateOfflineCachePersistenceRequest {
    preferred?: OfflineCacheStorageBackend;
}

export interface RecreateOfflineCachePersistenceResponse {
    status: boolean;
    effective: OfflineCacheStorageBackend;
    forcedFallback: boolean;
}

/**
 * Recreate the offline cache persistence service of the background SW script.
 * Required since each, frontend (options/popup) and background SW, have their own CustomStorageService singleton.
 * While this architecture is basically fine and avoids lots of synchronisation work through the message api when using IndexedDB cache backend,
 * it does not work well with the in-memory cache backend (which exists duplicated in both realms).
 * So we need this little overhead to definitively keep backend and frontend storage instance configurations perfectly in sync.
 */
onMessage("recreateOfflineCachePersistence", async (message) => {
    try {
        const preferred = message.data?.preferred;
        await CustomStorageService.recreateExtensionPassmanClientPersistenceService(preferred);
        return {
            status: true,
            effective: OfflineCacheStorageService.getEffective(),
            forcedFallback: OfflineCacheStorageService.isForcedFallback(),
        };
    } catch (error) {
        logger.error("[recreateOfflineCachePersistence]", error);
        return {
            status: false,
            effective: OfflineCacheStorageService.getEffective(),
            forcedFallback: OfflineCacheStorageService.isForcedFallback(),
        };
    }
});
