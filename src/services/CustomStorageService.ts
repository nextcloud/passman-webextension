import { Storage } from "@plasmohq/storage";
import { SecureStorage } from "@plasmohq/storage/dist/secure";
import UnlockExtensionService from "~services/UnlockExtensionService";

export default class CustomStorageService {
    private static sessionStorage: Storage;
    private static unsafeLocalStorage: Storage;
    private static secureStorage: SecureStorage;

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
}
