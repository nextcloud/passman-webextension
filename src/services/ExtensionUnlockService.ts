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
    public static readonly EXTENSION_SETUP_DONE_ACCESS_KEY = 'extensionSetupDone';

    /**
     * Unlock the extension with the extension unlock password.
     * The password is only used to unwrap the storage key and is never persisted anywhere.
     */
    public static async unlock(password: string, isFrontendCall = false): Promise<boolean> {
        if (!await this.isSetupDone()) {
            return false;
        }

        // The AES-GCM authentication tag of the wrapped storage key verifies the password
        const storageKey = await SecureStorage.decryptStorageKey(password);

        if (!storageKey) {
            logger.error("Failed to decrypt storage key during unlock");
            return false;
        }

        await this.applyUnlockedStorageKey(storageKey, isFrontendCall);
        return true;
    }

    /**
     * Hand the decrypted storage key over to the running extension and reflect the unlocked state in the UI.
     * Shared by the password based unlock, the initial setup and the auto-unlock.
     */
    public static async applyUnlockedStorageKey(storageKey: CryptoKey, isFrontendCall = false): Promise<void> {
        await CustomStorageService.getSessionStorage().set(
            this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY,
            await SecureStorage.exportStorageKeyBase64(storageKey)
        );
        ExtensionBadgeService.updateAllTabsIcon(isFrontendCall);
        this.notifyReloadContentScriptPicker();
        await ConsoleLoggingService.refreshLogLevel().catch(() => {
            // logging should not block unlock
        });
    }

    /**
     * Locks the extension, as well as taking care about clearing decrypted cache within the background service worker.
     * Should be called from the LockExtension MessageHandler.
     */
    public static async lock() {
        await CustomStorageService.clearSessionStorage();
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
     * Set the extension unlock password.
     * This also unlocks the extension already.
     * Generates a new storage key if one doesn't exist.
     * @param password
     * @throws Error when a storage key exists that cannot be unwrapped with the given password
     */
    public static async setUpExtensionPassword(password: string): Promise<void> {
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

        await this.applyUnlockedStorageKey(storageKey);
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

        // Decrypt the storage key with old password, which verifies it at the same time
        const storageKey = await SecureStorage.decryptStorageKey(oldPassword);

        if (!storageKey) {
            logger.error("Failed to decrypt storage key with old password");
            return false;
        }

        // Re-encrypt the storage key with new password
        const encryptedKeyData = await SecureStorage.encryptStorageKey(storageKey, newPassword);
        await SecureStorage.storeEncryptedStorageKey(encryptedKeyData);

        // The storage key itself is unchanged, so nothing but the session state has to be refreshed
        await CustomStorageService.getSessionStorage().set(
            this.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY,
            await SecureStorage.exportStorageKeyBase64(storageKey)
        );

        // Clear cached key in secure storage
        CustomStorageService.closeSecureStorage();

        return true;
    }

    public static setSetupDone() {
        return CustomStorageService.getUnsafeLocalStorage()
            .set(this.EXTENSION_SETUP_DONE_ACCESS_KEY, "true");
    }

    public static isExtensionPasswordSetUp() {
        return SecureStorage.hasEncryptedStorageKey();
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
