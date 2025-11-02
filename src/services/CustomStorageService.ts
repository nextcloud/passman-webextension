import { Storage } from "@/lib/storage";
import { SecureStorage } from "@/lib/secure-storage";
import ExtensionUnlockService from "./ExtensionUnlockService";
import type {
    RequestCachingHandlerInterface
} from "@binsky/passman-client-ts/lib/Interfaces/RequestCachingHandlerInterface";
import { get as idb_get, set as idb_set, del as idb_del } from 'idb-keyval';
import ExtensionPassmanClientPersistenceService from "./ExtensionPassmanClientPersistenceService";
import { customIndexedDBService } from "./CustomIndexedDBService";

export const CONTENT_SCRIPT_MODIFIED_CREDENTIALS_KEY = 'contentScriptModifiedCredentials';

// todo: empty atm, but we should use a namespace (may need a migration logic)
export const DEFAULT_STORAGE_NAMESPACE = '';

export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage?: SecureStorage;
    private static requestCachingHandler: RequestCachingHandlerInterface;

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
     * Get request cache handler that uses the volatile session storage backend.
     */
    public static getSessionRequestCachingHandler() {
        if (!this.requestCachingHandler) {
            this.requestCachingHandler = {
                set: async function (key: string, value: string): Promise<void> {
                    if (value === undefined) {
                        await CustomStorageService.getSessionStorage().remove(key);
                    } else {
                        await CustomStorageService.getSessionStorage().set(key, value);
                    }
                },
                get: function (key: string): Promise<string | undefined> {
                    return CustomStorageService.getSessionStorage().get(key);
                }
            };
        }
        return this.requestCachingHandler;
    }

    /**
     * Get request cache handler that uses the Indexed DB backend to avoid "Error: QUOTA_BYTES_PER_ITEM quota exceeded"
     * (which will occur by storing too big values in local storage).
     */
    public static getIndexedDBRequestCachingHandler() {
        if (!this.requestCachingHandler) {
            this.requestCachingHandler = {
                set: function (key: string, value: string): Promise<void> {
                    if (value === undefined) {
                        return idb_del(key);
                    } else {
                        return idb_set(key, value);
                    }
                },
                get: function (key: string): Promise<string | undefined> {
                    return idb_get(key);
                }
            };
        }
        return this.requestCachingHandler;
    }

    /**
     * todo: test decrypted data caching handler implementation
     */
    public static getExtensionPassmanClientPersistenceService() {
        return new ExtensionPassmanClientPersistenceService(
            true,
            CustomStorageService.getIndexedDBRequestCachingHandler(),
            customIndexedDBService
        );
    }
}
