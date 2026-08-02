import { Storage } from "@/lib/storage";
import { SecureStorage } from "@/lib/secure-storage";
import ExtensionUnlockService from "./ExtensionUnlockService";
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
import { logger } from "@/services/ConsoleLoggingService";

// todo: empty atm, but we should use a namespace (may need a migration logic)
export const DEFAULT_STORAGE_NAMESPACE = '';

type OfflineModelStore = (IndexedDbModelStore | InMemoryModelStore) & ModelStoreInterface & {
    estimateSize(): Promise<IndexedDbModelStoreSizeEstimate>;
    clearDatabase(): Promise<void>;
};

/**
 * todo: I don't rellay like what this became. When touching the class again, think about a refactoring of all the storage classes and their interaction.
 */
export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage?: SecureStorage;
    private static extensionPersistenceService?: ExtensionPassmanClientPersistenceService;
    private static offlineModelStore?: OfflineModelStore;
    private static initInFlight: Promise<ExtensionPassmanClientPersistenceService> | null = null;

    public static getSessionStorage() {
        if (!this.sessionStorage) {
            this.sessionStorage = new Storage("session", DEFAULT_STORAGE_NAMESPACE);
        }
        return this.sessionStorage;
    }

    public static getUnsafeLocalStorage() {
        if (!this.unsafeLocalStorage) {
            this.unsafeLocalStorage = new Storage("local", DEFAULT_STORAGE_NAMESPACE);
        }
        return this.unsafeLocalStorage;
    }

    /**
     * Returns an unlocked secure storage instance, if the extension is successfully unlocked.
     * If it is not successfully unlocked, it returns a secure storage without password.
     */
    public static async getSecureStorage() {
        if (!this.secureStorage) {
            this.secureStorage = new SecureStorage();
            this.secureStorage.setNamespace(DEFAULT_STORAGE_NAMESPACE);
        }
        if (!this.secureStorage.isPasswordSet) {
            const extensionUnlockPassword = await this.getSessionStorage().get(ExtensionUnlockService.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY);
            if (extensionUnlockPassword) {
                this.secureStorage.setPassword(
                    extensionUnlockPassword
                );
            }
        }
        return this.secureStorage;
    }

    public static closeSecureStorage() {
        if (this.secureStorage) {
            this.secureStorage = undefined;
        }
    }

    public static async clearSessionStorage() {
        return this.getSessionStorage().clear();
    }

    private static async readPreferredOfflineCacheBackend(): Promise<OfflineCacheStorageBackend> {
        try {
            const { default: ExtensionSettingsService, ExtensionSettingsOptions } = await import(
                "~/services/ExtensionSettingsService"
            );
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
            const { default: ExtensionSettingsService, ExtensionSettingsOptions } = await import(
                "~/services/ExtensionSettingsService"
            );
            await ExtensionSettingsService.updatePartialExtensionSettings(
                ExtensionSettingsOptions.offlineCacheStorageBackend,
                backend
            );
        } catch (error) {
            logger.warn(
                "[CustomStorageService] Could not persist offlineCacheStorageBackend (SecureStorage locked?)",
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
                    `[CustomStorageService] Model store IndexedDB "${IndexedDbModelStore.DEFAULT_DB_NAME}" reopened after unexpected loss (${reason}). Offline cache will refill on next network fetch.`
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
     * Probe/resolve offline-cache backend and create the PassmanClient persistence singleton.
     */
    public static async ensureExtensionPassmanClientPersistenceService(
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
     * Drop the current model store / persistence, invalidate PassmanClients, and rebuild for `preferred`.
     */
    public static async recreateExtensionPassmanClientPersistenceService(
        preferred?: OfflineCacheStorageBackend
    ): Promise<ExtensionPassmanClientPersistenceService> {
        this.initInFlight = null;
        this.extensionPersistenceService = undefined;
        this.offlineModelStore = undefined;
        inMemoryOnlyIndexedDBService.clear();

        const { default: PassmanClientService } = await import("~/services/PassmanClientService");
        PassmanClientService.invalidatePassmanClients();

        const resolvedPreferred = preferred ?? await this.readPreferredOfflineCacheBackend();
        return this.ensureExtensionPassmanClientPersistenceService(resolvedPreferred);
    }

    private static async getOfflineModelStore(): Promise<OfflineModelStore> {
        await this.ensureExtensionPassmanClientPersistenceService();
        if (!this.offlineModelStore) {
            throw new Error("Offline model store was not initialized");
        }
        return this.offlineModelStore;
    }

    public static async estimateOfflineModelStoreSize(): Promise<IndexedDbModelStoreSizeEstimate> {
        return (await this.getOfflineModelStore()).estimateSize();
    }

    public static async clearOfflineModelStore(): Promise<void> {
        await (await this.getOfflineModelStore()).clearDatabase();
        inMemoryOnlyIndexedDBService.clear();
    }
}
