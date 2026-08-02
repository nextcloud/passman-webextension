import ExtensionPassmanClientPersistenceService from "./ExtensionPassmanClientPersistenceService";
import { customIndexedDBService as inMemoryOnlyIndexedDBService } from "./CustomIndexedDBService";
import {
    IndexedDbModelStore,
    type IndexedDbModelStoreSizeEstimate,
} from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";
import type { ModelStoreInterface } from "@binsky/passman-client-ts/lib/Interfaces/ModelStoreInterface";
import OfflineCacheStorageService, {
    type OfflineCacheStorageBackend,
} from "~/services/OfflineCacheStorageService";
import InMemoryModelStore from "~/services/InMemoryModelStore";
import NotifyingModelStore from "~/services/NotifyingModelStore";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import { logger } from "@/services/ConsoleLoggingService";

type OfflineModelStore = (IndexedDbModelStore | InMemoryModelStore) & ModelStoreInterface & {
    estimateSize(): Promise<IndexedDbModelStoreSizeEstimate>;
    clearDatabase(): Promise<void>;
};

/**
 * Lifecycle for the offline-cache PassmanClient persistence singleton (model store + optional decrypted-field cache),
 * including the IndexedDB/in-memory backend probe/resolution and the user's persisted backend preference.
 */
export default class OfflineCachePersistenceService {
    private static extensionPersistenceService?: ExtensionPassmanClientPersistenceService;
    private static offlineModelStore?: OfflineModelStore;
    private static initInFlight: Promise<ExtensionPassmanClientPersistenceService> | null = null;

    private static async readPreferredOfflineCacheBackend(): Promise<OfflineCacheStorageBackend> {
        try {
            const value = await ExtensionSettingsService.getPartialExtensionSettings(
                ExtensionSettingsOptions.offlineCacheStorageBackend,
                true
            );
            if (value === "indexeddb" || value === "memory") {
                return value;
            }
        } catch {
            // SecureStorage may be locked; fall through to default
        }
        return OfflineCacheStorageService.DEFAULT_BACKEND;
    }

    private static async persistPreferredOfflineCacheBackend(
        backend: OfflineCacheStorageBackend
    ): Promise<void> {
        try {
            await ExtensionSettingsService.updatePartialExtensionSettings(
                ExtensionSettingsOptions.offlineCacheStorageBackend,
                backend
            );
        } catch (error) {
            logger.warn(
                "[OfflineCachePersistenceService] Could not persist offlineCacheStorageBackend (SecureStorage locked?)",
                error
            );
        }
    }

    private static createOfflineModelStore(effective: OfflineCacheStorageBackend): OfflineModelStore {
        if (effective === "memory") {
            return new InMemoryModelStore();
        }
        return new IndexedDbModelStore(
            IndexedDbModelStore.DEFAULT_DB_NAME,
            (reason) => {
                logger.warn(
                    `[OfflineCachePersistenceService] Model store IndexedDB "${IndexedDbModelStore.DEFAULT_DB_NAME}" reopened after unexpected loss (${reason}). Offline cache will refill on next network fetch.`
                );
                inMemoryOnlyIndexedDBService.clear();
            }
        );
    }

    private static async buildExtensionPassmanClientPersistenceService(
        preferred: OfflineCacheStorageBackend
    ): Promise<ExtensionPassmanClientPersistenceService> {
        const effective = await OfflineCacheStorageService.resolveEffectiveBackend(preferred);

        if (OfflineCacheStorageService.isForcedFallback()) {
            await this.persistPreferredOfflineCacheBackend("memory");
        }

        this.offlineModelStore = this.createOfflineModelStore(effective);
        this.extensionPersistenceService = new ExtensionPassmanClientPersistenceService(
            true,
            new NotifyingModelStore(this.offlineModelStore),
            inMemoryOnlyIndexedDBService
        );
        return this.extensionPersistenceService;
    }

    /**
     * Probe/resolve offline-cache backend and return the PassmanClient persistence singleton,
     * creating it on first call. Never throws for being called too early.
     */
    public static async get(
        preferred?: OfflineCacheStorageBackend
    ): Promise<ExtensionPassmanClientPersistenceService> {
        if (this.extensionPersistenceService) {
            return this.extensionPersistenceService;
        }
        if (this.initInFlight) {
            return this.initInFlight;
        }

        const resolvedPreferred = preferred ?? await this.readPreferredOfflineCacheBackend();
        this.initInFlight = this.buildExtensionPassmanClientPersistenceService(resolvedPreferred);
        try {
            return await this.initInFlight;
        } finally {
            this.initInFlight = null;
        }
    }

    /**
     * Drop the current model store / persistence and rebuild for "preferred".
     * Does not invalidate PassmanClients; callers that swap the backend under a live client
     * must call {@link PassmanClientService.invalidatePassmanClients} themselves.
     */
    public static async recreate(
        preferred?: OfflineCacheStorageBackend
    ): Promise<ExtensionPassmanClientPersistenceService> {
        this.initInFlight = null;
        this.extensionPersistenceService = undefined;
        this.offlineModelStore = undefined;
        inMemoryOnlyIndexedDBService.clear();

        const resolvedPreferred = preferred ?? await this.readPreferredOfflineCacheBackend();
        return this.get(resolvedPreferred);
    }

    private static async getOfflineModelStore(): Promise<OfflineModelStore> {
        await this.get();
        if (!this.offlineModelStore) {
            throw new Error("Offline model store was not initialized");
        }
        return this.offlineModelStore;
    }

    public static async estimateSize(): Promise<IndexedDbModelStoreSizeEstimate> {
        return (await this.getOfflineModelStore()).estimateSize();
    }

    public static async clear(): Promise<void> {
        await (await this.getOfflineModelStore()).clearDatabase();
        inMemoryOnlyIndexedDBService.clear();
    }
}
