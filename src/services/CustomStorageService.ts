import { Storage } from "@/lib/storage";
import { SecureStorage } from "@/lib/secure-storage";
import ExtensionUnlockService from "./ExtensionUnlockService";

// todo: empty atm, but we should use a namespace (may need a migration logic)
export const DEFAULT_STORAGE_NAMESPACE = '';

/**
 * Session / local / secure storage only.
 * The offline-cache PassmanClient persistence lifecycle (model store, IndexedDB/in-memory backend) lives in {@link OfflineCachePersistenceService} instead.
 */
export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage?: SecureStorage;

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
}
