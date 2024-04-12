import { Storage } from "@plasmohq/storage";
import { sha512 } from "js-sha512";

export default class UnlockExtensionService {
    public static readonly EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY = 'extensionUnlockPassword';
    public static readonly EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY = 'extensionUnlockPasswordHash';

    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;

    private static getSessionStorage() {
        if (!this.sessionStorage) {
            this.sessionStorage = new Storage({
                area: "session"
            });
        }
        return this.sessionStorage;
    }

    private static getUnsafeLocalStorage() {
        if (!this.unsafeLocalStorage) {
            this.unsafeLocalStorage = new Storage();
        }
        return this.unsafeLocalStorage;
    }

    public static unlock(password: string) {
        return this.isSetUp() && this.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY)
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                if (extensionUnlockPasswordHash === sha512(password)) {
                    await this.getSessionStorage().set(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY, password);
                    return true;
                }
                return false;
            });
    }

    public static lock() {
        return this.getSessionStorage().remove(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY);
    }

    /**
     * Set or overwrite the hash to validate the extension unlock password against.
     * This also unlocks the extension already.
     * @param password
     */
    public static setUp(password: string) {
        return this.getUnsafeLocalStorage()
            .set(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY, sha512(password))
            .then(() => {
                return this.getSessionStorage().set(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY, password);
            });
    }

    public static isSetUp() {
        return this.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY)
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                return extensionUnlockPasswordHash !== undefined && extensionUnlockPasswordHash !== null;
            });
    }

    public static isUnlocked() {
        return this.getSessionStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY)
            .then(async (extensionUnlockPassword: string | undefined) => {
                return extensionUnlockPassword !== undefined && extensionUnlockPassword !== null;
            });
    }
}
