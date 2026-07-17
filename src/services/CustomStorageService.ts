import { Storage } from "@/lib/storage";
import { SecureStorage } from "@/lib/secure-storage";
import ExtensionUnlockService from "./ExtensionUnlockService";
import ExtensionPassmanClientPersistenceService from "./ExtensionPassmanClientPersistenceService";
import { customIndexedDBService as inMemoryOnlyIndexedDBService } from "./CustomIndexedDBService";
import { IndexedDbModelStore } from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";

// todo: empty atm, but we should use a namespace (may need a migration logic)
export const DEFAULT_STORAGE_NAMESPACE = '';

export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage?: SecureStorage;
    private static extensionPersistenceService?: ExtensionPassmanClientPersistenceService;

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
            // set password (if possible) for fresh created or cached secureStorage instance without a password set
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

    /**
     * Persistence for PassmanClient: IndexedDB model store (+ optional decrypted-field cache).
     * Reuses one instance so background and popup share the same store configuration.
     */
    public static getExtensionPassmanClientPersistenceService() {
        if (!this.extensionPersistenceService) {
            this.extensionPersistenceService = new ExtensionPassmanClientPersistenceService(
                true,
                new IndexedDbModelStore(
                    IndexedDbModelStore.DEFAULT_DB_NAME,
                    (reason) => {
                        // Offline DTO cache was lost or the IDB connection died; drop decrypted-field cache too to prevent showing stale data.
                        console.warn(
                            `[CustomStorageService] Model store IndexedDB "${IndexedDbModelStore.DEFAULT_DB_NAME}" reopened after unexpected loss (${reason}). Offline cache will refill on next network fetch.`
                        );
                        inMemoryOnlyIndexedDBService.clear();
                    }
                ),
                inMemoryOnlyIndexedDBService
            );
        }
        return this.extensionPersistenceService;
    }
}
