import {
    DEFAULT_EXTENSION_LOG_LEVEL,
    EXTENSION_LOG_LEVEL_RANK,
    isExtensionLogLevel,
    type ExtensionLogLevel,
} from "~/lib/extensionLogLevel";
import CustomStorageService from "~/services/CustomStorageService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";

export type { ExtensionLogLevel } from "~/lib/extensionLogLevel";
export { DEFAULT_EXTENSION_LOG_LEVEL, isExtensionLogLevel } from "~/lib/extensionLogLevel";

const LOG_LEVEL_MIRROR_KEY = 'extensionLogLevel';

/**
 * Level-gated console logging for the extension.
 *
 * Encrypted {@link ExtensionSettingsOptions.logLevel} is authoritative when SecureStorage
 * can decrypt. An unencrypted local mirror keeps the last known level available while locked
 * (and in content scripts). {@link setLogLevel} is the single writer for both stores.
 */
export default class ConsoleLoggingService {
    private static currentLevel: ExtensionLogLevel = DEFAULT_EXTENSION_LOG_LEVEL;

    public static getLogLevel = (): ExtensionLogLevel => {
        return ConsoleLoggingService.currentLevel;
    }

    /**
     * Prefer encrypted settings when decryptable; otherwise fall back to the unsafe mirror.
     * Mirrors the encrypted value whenever it is successfully read.
     *
     * Does not use setting defaults for the encrypted read: an unset encrypted key must fall
     * through to the mirror (e.g. while locked after a previous unlock mirrored a custom level).
     */
    public static refreshLogLevel = async (): Promise<ExtensionLogLevel> => {
        const fromEncrypted = await ExtensionSettingsService.getPartialExtensionSettings(
            ExtensionSettingsOptions.logLevel,
            false,
        );

        if (isExtensionLogLevel(fromEncrypted)) {
            ConsoleLoggingService.currentLevel = fromEncrypted;
            await ConsoleLoggingService.writeMirror(fromEncrypted);
            return ConsoleLoggingService.currentLevel;
        }

        const fromMirror = await ConsoleLoggingService.readMirror();
        if (isExtensionLogLevel(fromMirror)) {
            ConsoleLoggingService.currentLevel = fromMirror;
            return ConsoleLoggingService.currentLevel;
        }

        ConsoleLoggingService.currentLevel = DEFAULT_EXTENSION_LOG_LEVEL;
        return ConsoleLoggingService.currentLevel;
    }

    /**
     * Single writer: encrypted ExtensionSettings + unsafe local mirror + in-memory level.
     * Requires an unlocked SecureStorage (same as other extension settings writes).
     */
    public static setLogLevel = async (level: ExtensionLogLevel): Promise<void> => {
        if (!isExtensionLogLevel(level)) {
            throw new Error(`Invalid extension log level: ${String(level)}`);
        }

        await ExtensionSettingsService.updatePartialExtensionSettings(
            ExtensionSettingsOptions.logLevel,
            level,
        );
        await ConsoleLoggingService.writeMirror(level);
        ConsoleLoggingService.currentLevel = level;
    }

    private static readMirror = async (): Promise<unknown> => {
        try {
            return await CustomStorageService.getUnsafeLocalStorage().get(LOG_LEVEL_MIRROR_KEY);
        } catch {
            return undefined;
        }
    }

    private static writeMirror = async (level: ExtensionLogLevel): Promise<void> => {
        try {
            await CustomStorageService.getUnsafeLocalStorage().set(LOG_LEVEL_MIRROR_KEY, level);
        } catch {
            // Mirror is best-effort (e.g. storage unavailable in some test contexts).
        }
    }

    public static shouldEmit = (methodLevel: ExtensionLogLevel): boolean => {
        return EXTENSION_LOG_LEVEL_RANK[methodLevel] >= EXTENSION_LOG_LEVEL_RANK[ConsoleLoggingService.currentLevel];
    }
}

export const logger = {
    debug(...args: unknown[]): void {
        if (ConsoleLoggingService.shouldEmit('debug')) {
            console.debug(...args);
        }
    },
    log(...args: unknown[]): void {
        if (ConsoleLoggingService.shouldEmit('log')) {
            console.log(...args);
        }
    },
    info(...args: unknown[]): void {
        if (ConsoleLoggingService.shouldEmit('info')) {
            console.info(...args);
        }
    },
    warn(...args: unknown[]): void {
        if (ConsoleLoggingService.shouldEmit('warn')) {
            console.warn(...args);
        }
    },
    error(...args: unknown[]): void {
        if (ConsoleLoggingService.shouldEmit('error')) {
            console.error(...args);
        }
    },
};
