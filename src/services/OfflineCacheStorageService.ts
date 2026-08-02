import { Storage } from "@/lib/storage";
import { logger } from "~/services/ConsoleLoggingService";
import ExtensionUnlockService from "./ExtensionUnlockService";

export type OfflineCacheStorageBackend = "indexeddb" | "memory";
export type OfflineCacheNoticeCode = "unavailable" | "quota";

export interface OfflineCacheNotice {
    code: OfflineCacheNoticeCode;
    at: number;
    detail?: string;
}

const PROBE_DB = "passman-idb-probe";
const NOTICE_KEY = "offlineCacheStorageNotice";

/**
 * Probes native IndexedDB and tracks whether the offline model store should use persistent
 * IndexedDB or a volatile in-memory {@link InMemoryModelStore}, since Firefox "Never remember history"
 * blocks native IndexedDB writes.
 */
export default class OfflineCacheStorageService {
    public static readonly DEFAULT_BACKEND: OfflineCacheStorageBackend = "indexeddb";

    private static session = new Storage("session");
    private static preferred: OfflineCacheStorageBackend = this.DEFAULT_BACKEND;
    private static effective: OfflineCacheStorageBackend = this.DEFAULT_BACKEND;
    private static nativeAvailable: boolean | undefined;
    private static forcedFallback = false;
    private static lastErrorCode: OfflineCacheNoticeCode | undefined;

    public static getPreferred = (): OfflineCacheStorageBackend => this.preferred;
    public static getEffective = (): OfflineCacheStorageBackend => this.effective;
    public static isNativeAvailable = (): boolean | undefined => this.nativeAvailable;
    public static isForcedFallback = (): boolean => this.forcedFallback;
    public static getLastErrorCode = (): OfflineCacheNoticeCode | undefined => this.lastErrorCode;

    /** Throwaway write against native IndexedDB. */
    public static async probeNativeIndexedDb(): Promise<boolean> {
        const factory = globalThis.indexedDB;
        if (!factory) {
            this.nativeAvailable = false;
            return false;
        }

        const available = await new Promise<boolean>((resolve) => {
            const done = (ok: boolean) => {
                try {
                    factory.deleteDatabase(PROBE_DB);
                } catch {
                    // ignore
                }
                resolve(ok);
            };

            try {
                const req = factory.open(PROBE_DB, 1);
                req.onerror = () => done(false);
                req.onupgradeneeded = () => {
                    try {
                        req.result.createObjectStore("p");
                    } catch {
                        done(false);
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    try {
                        const tx = db.transaction("p", "readwrite");
                        tx.objectStore("p").put(1, "k");
                        tx.oncomplete = () => {
                            db.close();
                            done(true);
                        };
                        tx.onerror = () => {
                            db.close();
                            done(false);
                        };
                    } catch {
                        db.close();
                        done(false);
                    }
                };
            } catch {
                done(false);
            }
        });

        this.nativeAvailable = available;
        return available;
    }

    /**
     * Resolve the backend for the model store. If IndexedDB is preferred but unusable, force memory
     * and enqueue an `unavailable` notice.
     */
    public static async resolveEffectiveBackend(
        preferred: OfflineCacheStorageBackend = OfflineCacheStorageService.DEFAULT_BACKEND
    ): Promise<OfflineCacheStorageBackend> {
        this.preferred = preferred;

        if (preferred === "memory" || !(await this.probeNativeIndexedDb())) {
            this.forcedFallback = preferred === "indexeddb";
            this.lastErrorCode = this.forcedFallback ? "unavailable" : undefined;
            this.effective = "memory";
            if (this.forcedFallback) {
                this.preferred = "memory";
                logger.warn(
                    "[OfflineCacheStorageService] Native IndexedDB unavailable; using in-memory cache (lost on SW restart)"
                );
                if (await ExtensionUnlockService.isSetupDone()) {
                    await this.enqueueNotice("unavailable");
                }
            }
            return "memory";
        }

        this.forcedFallback = false;
        this.lastErrorCode = undefined;
        this.effective = "indexeddb";
        return "indexeddb";
    }

    public static async enqueueNotice(code: OfflineCacheNoticeCode, detail?: string): Promise<void> {
        this.lastErrorCode = code;
        await this.session.set(NOTICE_KEY, { code, detail, at: Date.now() } satisfies OfflineCacheNotice);
    }

    /** Read and clear the session notice (popup/options mount). */
    public static async consumeNotice(): Promise<OfflineCacheNotice | undefined> {
        const notice = await this.session.get<OfflineCacheNotice>(NOTICE_KEY);
        if (notice) {
            await this.session.remove(NOTICE_KEY);
        }
        return notice;
    }
}
