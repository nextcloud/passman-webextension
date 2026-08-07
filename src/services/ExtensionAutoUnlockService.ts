import CustomStorageService from "./CustomStorageService";
import ExtensionUnlockService from "./ExtensionUnlockService";
import { SecureStorage } from "@/lib/secure-storage";
import {
    type AutoUnlockKeyStorageBackend,
    createAutoUnlockKey,
    deleteAutoUnlockKey,
    loadAutoUnlockKey,
    probeAutoUnlockKeyStorageBackend,
} from "@/lib/auto-unlock-key-store";
import { logger } from "./ConsoleLoggingService";

/**
 * Optional feature that unlocks the extension on browser start without asking for the unlock password.
 *
 * The storage key gets a second, independent wrapping under a random auto-unlock key.
 * No key derivation is involved here, as the auto-unlock key has strong entropy.
 * The unlock password is not part of this at all and stays unrecoverable.
 *
 * This is a convenience versus exposure trade: whoever can run code in the extension origin, or read the
 * auto-unlock key from the browser profile, can unwrap the (SecureStorage) storage key without knowing the password.
 * If that happens, it would leak everything, since the Nextcloud user and vault keys are stored in the SecureStorage.
 */
export default class ExtensionAutoUnlockService {
    public static readonly WRAPPED_STORAGE_KEY_UNSAFE_ACCESS_KEY = 'autoUnlockWrappedStorageKey';
    private static readonly AES_GCM_IV_LENGTH = 12; // 96 bits, the nonce size AES-GCM is specified for

    private static autoUnlockAttempt: Promise<boolean> | undefined;

    /**
     * Report which backend would hold the auto-unlock key, so the settings UI can warn about the
     * weaker local storage fallback before the user enables the feature.
     */
    public static getStorageBackend(): Promise<AutoUnlockKeyStorageBackend> {
        return probeAutoUnlockKeyStorageBackend();
    }

    public static async isEnabled(): Promise<boolean> {
        if (!await this.getWrappedStorageKey()) {
            return false;
        }

        return await loadAutoUnlockKey() !== undefined;
    }

    /**
     * Arm auto-unlock for the currently unlocked storage key.
     * A fresh auto-unlock key is generated every time, so a previously stored one can never be reused.
     * @returns false if the extension is locked
     */
    public static async enable(): Promise<boolean> {
        const storageKey = await this.getSessionStorageKey();
        if (!storageKey) {
            logger.warn("Cannot enable auto-unlock while the extension is locked");
            return false;
        }

        const { key: autoUnlockKey } = await createAutoUnlockKey();
        const iv = crypto.getRandomValues(new Uint8Array(this.AES_GCM_IV_LENGTH));
        const wrappedStorageKey = await crypto.subtle.wrapKey(
            "raw",
            storageKey,
            autoUnlockKey,
            { name: "AES-GCM", iv }
        );

        await CustomStorageService.getUnsafeLocalStorage().set(this.WRAPPED_STORAGE_KEY_UNSAFE_ACCESS_KEY, {
            iv: Array.from(iv),
            value: btoa(String.fromCharCode(...new Uint8Array(wrappedStorageKey))),
        });

        return true;
    }

    /**
     * Disarm auto-unlock by dropping the auto-unlock key and the wrapped storage key.
     */
    public static async disable(): Promise<void> {
        await deleteAutoUnlockKey();
        await CustomStorageService.getUnsafeLocalStorage().remove(this.WRAPPED_STORAGE_KEY_UNSAFE_ACCESS_KEY);
    }

    /**
     * Unlock the extension from the stored auto-unlock key, if the feature is armed.
     * Any unusable state disarms the feature instead of leaving a half broken setup behind.
     * Concurrent attempts share one run.
     * @returns true if the extension is unlocked afterwards
     */
    public static tryAutoUnlock(): Promise<boolean> {
        if (!this.autoUnlockAttempt) {
            this.autoUnlockAttempt = this.runAutoUnlock().finally(() => {
                this.autoUnlockAttempt = undefined;
            });
        }

        return this.autoUnlockAttempt;
    }

    private static async runAutoUnlock(): Promise<boolean> {
        if (await ExtensionUnlockService.isUnlocked()) {
            return true;
        }

        const wrappedStorageKey = await this.getWrappedStorageKey();
        if (!wrappedStorageKey) {
            return false;
        }

        const autoUnlockKey = await loadAutoUnlockKey();
        if (!autoUnlockKey) {
            logger.warn("A wrapped storage key exists without an auto-unlock key");
            await this.disable();
            return false;
        }

        try {
            const storageKey = await crypto.subtle.unwrapKey(
                "raw",
                Uint8Array.from(atob(wrappedStorageKey.value), c => c.charCodeAt(0)),
                autoUnlockKey.key,
                { name: "AES-GCM", iv: new Uint8Array(wrappedStorageKey.iv) },
                { name: "AES-GCM" },
                // extractable, so it can be handed to the session and re-wrapped later
                true,
                ["encrypt", "decrypt"]
            );
            await ExtensionUnlockService.applyUnlockedStorageKey(storageKey);
            return true;
        } catch (e) {
            logger.error("Failed to unwrap the storage key", e);
            await this.disable();
            return false;
        }
    }

    private static getWrappedStorageKey(): Promise<{ iv: number[]; value: string } | undefined> {
        return CustomStorageService.getUnsafeLocalStorage()
            .get<{ iv: number[]; value: string }>(this.WRAPPED_STORAGE_KEY_UNSAFE_ACCESS_KEY);
    }

    private static async getSessionStorageKey(): Promise<CryptoKey | undefined> {
        const rawStorageKey = await CustomStorageService.getSessionStorage()
            .get<string>(ExtensionUnlockService.EXTENSION_STORAGE_KEY_SESSION_ACCESS_KEY);

        return rawStorageKey ? await SecureStorage.importStorageKeyBase64(rawStorageKey) : undefined;
    }
}
