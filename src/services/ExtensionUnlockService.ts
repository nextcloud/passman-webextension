import { sha512 } from "js-sha512";
import CustomStorageService from "~services/CustomStorageService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
import { ExtensionBadgeService } from "~services/backend/ExtensionBadgeService";

export default class ExtensionUnlockService {
    public static readonly EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY = 'extensionUnlockPassword';
    public static readonly EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY = 'extensionUnlockPasswordHash';
    public static readonly EXTENSION_SETUP_DONE_ACCESS_KEY = 'extensionSetupDone';

    public static async unlock(password: string, isFrontendCall = false) {
        return await this.isSetupDone() && await (CustomStorageService.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY))
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                if (extensionUnlockPasswordHash === sha512(password)) {
                    await CustomStorageService.getSessionStorage().set(this.EXTENSION_UNLOCK_PASSWORD_SESSION_ACCESS_KEY, password);
                    ExtensionBadgeService.updateAllTabsIcon(isFrontendCall);
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
        ExtensionBadgeService.displayLockIcons();
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

    /**
     * Returns the unlocked default vault if possible. It does not refresh the vault to load credentials from the api.
     */
    public static async getUnlockedDefaultVault(createWithNextcloudServerMessagingConnector = false): Promise<Vault> {
        return await ExtensionUnlockService.isUnlocked().then(async (isUnlocked) => {
            if (isUnlocked) {
                return await ExtensionSettingsService.getPassmanClient(createWithNextcloudServerMessagingConnector).then(async (passmanClient) => {
                    if (passmanClient) {
                        return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                            try {
                                let myVault = await passmanClient.getVaultByGuid(defaultVaultInfo.guid, true);
                                if (myVault) {
                                    if (myVault.vaultKey === undefined || myVault.vaultKey === null) {
                                        // seems not to be unlocked yet
                                        if (myVault.testVaultKey(defaultVaultInfo.password)) {
                                            // unlock successful
                                            myVault.vaultKey = defaultVaultInfo.password;
                                            return myVault;
                                        } else {
                                            return;
                                        }
                                    }
                                    return myVault;
                                }
                            } catch (exception) {
                                // Could not get or decrypt vault
                                console.error(exception);
                            }
                        });
                    }
                });
            }
        });
    }
}
