import { sha512 } from "js-sha512";
import CustomStorageService from "./CustomStorageService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "./ExtensionSettingsService";
import PassmanClientService from "./PassmanClientService";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
import { ExtensionBadgeService } from "./backend/ExtensionBadgeService";
import ContextMenuService from "./backend/ContextMenuService";
import type { PassmanClient } from "@binsky/passman-client-ts/lib/PassmanClient";
import type { BackendPassmanClient } from "@/lib/BackendPassmanClient";
import browser from "webextension-polyfill";
import { sendMessage } from "@/entrypoints/background/messaging";
import { RemoteCallableFunctionNames, RemoteCallableFunctions } from "@/entrypoints/content/remoteCallableFunctions";
import { SecureStorage } from "@/lib/secure-storage";
import ConsoleLoggingService, { logger } from "./ConsoleLoggingService";

export default class ExtensionUnlockService {
    public static readonly EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY = 'extensionStorageKey';
    public static readonly EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY = 'extensionUnlockPasswordHash';
    public static readonly EXTENSION_AUTO_UNLOCK_PASSWORD_ACCESS_KEY = 'extensionAutoUnlockPassword';
    public static readonly EXTENSION_SETUP_DONE_ACCESS_KEY = 'extensionSetupDone';

    public static async unlock(password: string, isFrontendCall = false) {
        return await this.isSetupDone() && await (CustomStorageService.getUnsafeLocalStorage()
            .get(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY))
            .then(async (extensionUnlockPasswordHash: string | undefined) => {
                if (extensionUnlockPasswordHash === sha512(password)) {
                    // Verify that we can decrypt the storage key with this password
                    const storageKey = await SecureStorage.decryptStorageKey(password);

                    if (!storageKey) {
                        logger.error("Failed to decrypt storage key during unlock");
                        return false;
                    }

                    await CustomStorageService.getSessionStorage().set(
                        this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY,
                        await SecureStorage.exportStorageKeyBase64(storageKey)
                    );
                    ExtensionBadgeService.updateAllTabsIcon(isFrontendCall);
                    this.notifyReloadContentScriptPicker();
                    await ConsoleLoggingService.refreshLogLevel().catch(() => {
                        // logging should not block unlock
                    });
                    return true;
                }
                return false;
            });
    }

    public static async setAutoUnlockExtensionPassword(password: string) {
        await CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_AUTO_UNLOCK_PASSWORD_ACCESS_KEY, password);
    }

    public static async getAutoUnlockExtensionPassword(): Promise<string | undefined> {
        return await CustomStorageService.getUnsafeLocalStorage()
            .get<string>(this.EXTENSION_AUTO_UNLOCK_PASSWORD_ACCESS_KEY);
    }

    public static async clearAutoUnlockExtensionPassword() {
        await CustomStorageService.getUnsafeLocalStorage()
            .remove(this.EXTENSION_AUTO_UNLOCK_PASSWORD_ACCESS_KEY);
    }

    /**
     * Locks the extension, as well as taking care about clearing decrypted cache within the background service worker.
     * Once locked, a potential stored vault key for the auto-unlock feature is invalidated.
     * Should be called from the LockExtension MessageHandler.
     */
    public static async lock() {
        await CustomStorageService.clearSessionStorage();
        await ExtensionUnlockService.clearAutoUnlockExtensionPassword();
        CustomStorageService.closeSecureStorage();
        PassmanClientService.invalidatePassmanClients();
        ExtensionBadgeService.displayLockIcons();
        ContextMenuService.reCreateContextMenuParentItems(false);
        this.notifyReloadContentScriptPicker();
    }

    protected static notifyReloadContentScriptPicker() {
        // Query the current active tab
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
            if (tabs[0]?.id) {
                try {
                    await sendMessage(
                        RemoteCallableFunctions.remoteFunctionCallMessageName,
                        {
                            method: RemoteCallableFunctionNames.reloadPicker,
                        },
                        tabs[0]?.id
                    );
                } catch (e) {
                    // fails for non-content-injectable tabs like "chrome://extensions/"
                    logger.warn("notifyReloadContentScriptPicker failed due to an error. This usually fails for non-content-injectable tabs.", e);
                }
            }
        });
    }

    /**
     * Set or overwrite the hash to validate the extension unlock password against.
     * This also unlocks the extension already.
     * Generates a new storage key if one doesn't exist.
     * @param password
     */
    public static async setUpExtensionPassword(password: string, setAsAutoUnlockPassword = false): Promise<void> {
        // Generate and store encryption key if it doesn't exist
        let storageKey: CryptoKey | null;
        if (await SecureStorage.hasEncryptedStorageKey()) {
            storageKey = await SecureStorage.decryptStorageKey(password);
            if (!storageKey) {
                throw new Error("A storage key already exists but could not be decrypted with the given password");
            }
        } else {
            storageKey = await SecureStorage.generateStorageKey();
            const encryptedKeyData = await SecureStorage.encryptStorageKey(storageKey, password);
            await SecureStorage.storeEncryptedStorageKey(encryptedKeyData);
        }

        await CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY, sha512(password));

        await CustomStorageService.getSessionStorage().set(
            this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY,
            await SecureStorage.exportStorageKeyBase64(storageKey)
        );
        if (setAsAutoUnlockPassword) {
            await ExtensionUnlockService.setAutoUnlockExtensionPassword(password);
        }
    }

    /**
     * Change the extension unlock password.
     * This re-encrypts the storage key with the new password.
     * @param oldPassword The current password
     * @param newPassword The new password
     * @returns true if successful, false if old password is incorrect
     */
    public static async changeExtensionPassword(oldPassword: string, newPassword: string): Promise<boolean> {
        if (!newPassword) {
            return false;
        }

        // Verify old password
        const oldPasswordHash = await CustomStorageService.getUnsafeLocalStorage()
            .get<string>(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY);

        if (!oldPasswordHash || oldPasswordHash !== sha512(oldPassword)) {
            return false;
        }

        // Decrypt the storage key with old password
        const storageKey = await SecureStorage.decryptStorageKey(oldPassword);

        if (!storageKey) {
            logger.error("Failed to decrypt storage key with old password");
            return false;
        }

        // Re-encrypt the storage key with new password
        const encryptedKeyData = await SecureStorage.encryptStorageKey(storageKey, newPassword);
        await SecureStorage.storeEncryptedStorageKey(encryptedKeyData);

        // Update password hash and session storage. The storage key itself is unchanged.
        await CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_UNLOCK_PASSWORD_HASH_ACCESS_KEY, sha512(newPassword));
        await CustomStorageService.getSessionStorage().set(
            this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY,
            await SecureStorage.exportStorageKeyBase64(storageKey)
        );

        // Update auto-unlock password if it was set
        if (await ExtensionUnlockService.getAutoUnlockExtensionPassword()) {
            await ExtensionUnlockService.setAutoUnlockExtensionPassword(newPassword);
        }

        // Clear cached key in secure storage
        CustomStorageService.closeSecureStorage();

        return true;
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

    /**
     * The extension is unlocked if the extension session storage contains the storage key.
     * This is fine as it's in only extension-accessible memory, only written by the extension.
     */
    public static isUnlocked() {
        return CustomStorageService.getSessionStorage()
            .get(this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY)
            .then(async (rawStorageKey: string | undefined) => {
                return rawStorageKey !== undefined && rawStorageKey !== null;
            });
    }

    /**
     * Returns the unlocked default vault if possible. It does not refresh the vault to load credentials from the api.
     */
    public static async getUnlockedDefaultVault(isFrontendCall = false): Promise<Vault | undefined> {
        return await ExtensionUnlockService.isUnlocked().then(async (isUnlocked) => {
            if (isUnlocked) {
                let passmanClientPromise: Promise<PassmanClient> | Promise<BackendPassmanClient | null>;
                if (isFrontendCall) {
                    passmanClientPromise = PassmanClientService.getPopupPassmanClient();
                } else {
                    passmanClientPromise = PassmanClientService.getBackendPassmanClient();
                }
                return await passmanClientPromise.then(async (passmanClient) => {
                    if (passmanClient) {
                        return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                            if (defaultVaultInfo) {
                                try {
                                    let myVault = await passmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
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
                                    logger.error(exception);
                                }
                            } else {
                                logger.error("No default vault info found");
                                return;
                            }
                        });
                    }
                });
            }
        });
    }
}
