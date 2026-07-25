import browser from "webextension-polyfill";
import CustomStorageService from "./CustomStorageService";
import { logger } from "~/services/ConsoleLoggingService";

/**
 * One-shot / version-gated migrations for extension upgrades.
 */
export default class ExtensionMigrationService {

    /**
     * Flag to mark the "maybeRemoveLegacyKeyvalStore" migration as done.
     */
    private static readonly REMOVED_KEYVAL_STORE_FLAG = "migration.removedLegacyKeyvalStore";

    /**
     * Run migrations triggered by browser.runtime.onInstalled.
     */
    public static async runOnInstalled(details: browser.Runtime.OnInstalledDetailsType): Promise<void> {
        if (details.reason === "install") {
            // Fresh install never had the legacy store; mark done so startup skips the delete.
            await this.markLegacyKeyvalStoreMigrationDone();
        } else if (details.reason === "update") {
            await this.maybeRemoveLegacyKeyvalStore(details.previousVersion);
        }
    }

    /**
     * Safety net for very important upgrades that happened before this migration existed, or if onInstalled did not run for some reason.
     * Idempotent via {@link REMOVED_KEYVAL_STORE_FLAG}.
     */
    public static async runOnStartup(): Promise<void> {
        // just a placeholder for now, no use-case for this yet
    }

    /**
     * Delete the orphaned idb-keyval IndexedDB (`keyval-store`) once.
     * Covers upgrades from &lt; 0.3.0 and early 0.3.0 builds that never recorded the migration flag.
     */
    private static async maybeRemoveLegacyKeyvalStore(previousVersion?: string): Promise<void> {
        const storage = CustomStorageService.getUnsafeLocalStorage();
        if (await storage.get<boolean>(this.REMOVED_KEYVAL_STORE_FLAG)) {
            return;
        }

        /**
         * Extension version that replaced the idb-keyval request cache with the passman-client-ts model store.
         */
        const MODEL_STORE_INTRODUCED_IN_VERSION = "0.3.0";
        /**
         * Default IndexedDB database name used by idb-keyval for the former raw-GET request cache.
         * @see https://github.com/jakearchibald/idb-keyval#custom-stores
         */
        const LEGACY_IDB_KEYVAL_STORE_NAME = "keyval-store";

        try {
            await this.deleteIndexedDatabase(LEGACY_IDB_KEYVAL_STORE_NAME);
            const fromPreModelStore =
                previousVersion !== undefined &&
                this.isVersionLessThan(previousVersion, MODEL_STORE_INTRODUCED_IN_VERSION);
            logger.info(
                `[migration] Removed legacy IndexedDB "${LEGACY_IDB_KEYVAL_STORE_NAME}"` +
                    (previousVersion
                        ? ` (update from ${previousVersion}` +
                          (fromPreModelStore ? `, pre-${MODEL_STORE_INTRODUCED_IN_VERSION}` : "") +
                          ")"
                        : " (one-shot startup cleanup)")
            );
        } catch (e) {
            logger.warn(`[migration] Failed to remove legacy IndexedDB "${LEGACY_IDB_KEYVAL_STORE_NAME}"`, e);
            // Do not set the flag on failure so a later SW start can retry
            return;
        }

        await this.markLegacyKeyvalStoreMigrationDone();
    }

    private static async markLegacyKeyvalStoreMigrationDone(): Promise<void> {
        await CustomStorageService.getUnsafeLocalStorage().set(this.REMOVED_KEYVAL_STORE_FLAG, true);
    }

    /**
     * Numeric dotted-version compare (ignores pre-release suffixes on a segment).
     * Useful for version-gated migrations.
     * Recommendation: use flag-gated migrations instead, it's usually more reliable.
     */
    public static isVersionLessThan(version: string, reference: string): boolean {
        const parse = (v: string) =>
            v.split(".").map((segment) => parseInt(segment.replace(/[^0-9].*$/, ""), 10) || 0);

        const a = parse(version);
        const b = parse(reference);
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i++) {
            const x = a[i] ?? 0;
            const y = b[i] ?? 0;
            if (x < y) {
                return true;
            }
            if (x > y) {
                return false;
            }
        }
        return false;
    }

    private static deleteIndexedDatabase(dbName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error ?? new Error(`Failed to delete IndexedDB "${dbName}"`));
            // Another open connection can block deletion; treat as soft failure for retry later
            request.onblocked = () => reject(new Error(`Delete of IndexedDB "${dbName}" blocked by an open connection`));
        });
    }
}
