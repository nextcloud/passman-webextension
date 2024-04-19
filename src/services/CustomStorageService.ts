import { Storage } from "@plasmohq/storage";
import { SecureStorage } from "@plasmohq/storage/dist/secure";
import UnlockExtensionService from "~services/UnlockExtensionService";
import type {
    RequestCachingHandlerInterface
} from "@binsky/passman-client-ts/lib/Interfaces/RequestCachingHandlerInterface";

export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage: SecureStorage;
    private static requestCachingHandler: RequestCachingHandlerInterface;

    public static getSessionStorage() {
        if (!this.sessionStorage) {
            this.sessionStorage = new Storage({
                area: "session"
            });
        }
        return this.sessionStorage;
    }

    public static getUnsafeLocalStorage() {
        if (!this.unsafeLocalStorage) {
            this.unsafeLocalStorage = new Storage();
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
            await this.secureStorage.setPassword(
                await this.getSessionStorage().get(UnlockExtensionService.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY)
            );
        }
        return this.secureStorage;
    }

    public static closeSecureStorage() {
        if (this.secureStorage) {
            this.secureStorage = null;
        }
    }

    public static async clearSessionStorage() {
        return this.getSessionStorage().clear(true);
    }

    /**
     * Get request cache handler that uses the volatile session storage backend.
     */
    public static getSessionRequestCachingHandler() {
        if (!this.requestCachingHandler) {
            this.requestCachingHandler = {
                set: function (key: string, value: string): Promise<void> {
                    //return idb_set(key, value);
                    return CustomStorageService.getSessionStorage().set(key, value);
                },
                get: function (key: string): Promise<string> {
                    //return idb_get(key);
                    return CustomStorageService.getSessionStorage().get(key);
                }
            };
        }
        return this.requestCachingHandler;
    }
}
