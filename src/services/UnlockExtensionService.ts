import { sha512 } from "js-sha512";
import CustomStorageService from "~services/CustomStorageService";
import ExtensionSettingsService from "~services/ExtensionSettingsService";

export default class UnlockExtensionService {
    public static readonly EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY = 'extensionUnlockPassword';
    public static readonly EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY = 'extensionUnlockPasswordHash';
    public static readonly EXTENSION_SETUP_DONE_ACCESS_KEY = 'extensionSetupDone';

    public static unlock(password: string) {
        return this.isSetupDone() && CustomStorageService.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY)
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                if (extensionUnlockPasswordHash === sha512(password)) {
                    await CustomStorageService.getSessionStorage().set(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY, password);
                    return true;
                }
                return false;
            });
    }

    /**
     * Locks the extension, as well as taking care about clearing decrypted cache within the background service worker.
     */
    public static async lock() {
        await CustomStorageService.clearSessionStorage();
        CustomStorageService.closeSecureStorage();
        ExtensionSettingsService.updatePassmanClient(null);
    }

    /**
     * Set or overwrite the hash to validate the extension unlock password against.
     * This also unlocks the extension already.
     * @param password
     */
    public static setUpExtensionPassword(password: string) {
        return CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY, sha512(password))
            .then(() => {
                return CustomStorageService.getSessionStorage().set(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY, password);
            });
    }

    public static setSetupDone() {
        return CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_SETUP_DONE_ACCESS_KEY, "true");
    }

    public static isExtensionPasswordSetUp() {
        return CustomStorageService.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY)
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                return extensionUnlockPasswordHash !== undefined && extensionUnlockPasswordHash !== null;
            });
    }

    public static isSetupDone() {
        return CustomStorageService.getUnsafeLocalStorage()
            .get(this.EXTENSION_SETUP_DONE_ACCESS_KEY)
            .then(async (isSetUp: string | undefined) => {
                return isSetUp === "true";
            });
    }

    public static isUnlocked() {
        return CustomStorageService.getSessionStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY)
            .then(async (extensionUnlockPassword: string | undefined) => {
                return extensionUnlockPassword !== undefined && extensionUnlockPassword !== null;
            });
    }
}
