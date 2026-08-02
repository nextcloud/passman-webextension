import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * OfflineCacheStorageService pulls in webextension Storage; stub the session area and ExtensionUnlockService before importing the module under test
 */
const sessionData = new Map<string, unknown>();

mock.module("@/lib/storage", () => ({
    Storage: class {
        async get<T>(key: string): Promise<T | undefined> {
            return sessionData.get(key) as T | undefined;
        }
        async set(key: string, value: unknown): Promise<void> {
            sessionData.set(key, value);
        }
        async remove(key: string): Promise<void> {
            sessionData.delete(key);
        }
        async clear(): Promise<void> {
            sessionData.clear();
        }
        async getAll() {
            return Object.fromEntries(sessionData);
        }
        setNamespace() {}
    },
}));

mock.module("~/services/ExtensionUnlockService", () => ({
    default: {
        isSetupDone: async () => true,
    },
}));

mock.module("~/services/ConsoleLoggingService", () => ({
    logger: {
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
        log: () => {},
    },
}));

const { default: OfflineCacheStorageService } = await import("./OfflineCacheStorageService");

describe("OfflineCacheStorageService.resolveEffectiveBackend", () => {
    const originalIndexedDB = globalThis.indexedDB;

    beforeEach(() => {
        sessionData.clear();
    });

    afterEach(() => {
        Object.defineProperty(globalThis, "indexedDB", {
            value: originalIndexedDB,
            configurable: true,
            writable: true,
        });
    });

    test("preferred memory uses memory without forced fallback", async () => {
        const effective = await OfflineCacheStorageService.resolveEffectiveBackend("memory");
        expect(effective).toBe("memory");
        expect(OfflineCacheStorageService.isForcedFallback()).toBe(false);
        expect(OfflineCacheStorageService.getEffective()).toBe("memory");
        expect(await OfflineCacheStorageService.consumeNotice()).toBeUndefined();
    });

    test("indexeddb preferred with missing factory forces memory and enqueues notice", async () => {
        Object.defineProperty(globalThis, "indexedDB", {
            value: undefined,
            configurable: true,
            writable: true,
        });

        const effective = await OfflineCacheStorageService.resolveEffectiveBackend("indexeddb");
        expect(effective).toBe("memory");
        expect(OfflineCacheStorageService.isForcedFallback()).toBe(true);
        expect(OfflineCacheStorageService.getPreferred()).toBe("memory");
        expect(OfflineCacheStorageService.getLastErrorCode()).toBe("unavailable");

        const notice = await OfflineCacheStorageService.consumeNotice();
        expect(notice?.code).toBe("unavailable");
        expect(await OfflineCacheStorageService.consumeNotice()).toBeUndefined();
    });

    test("indexeddb preferred when probe write fails forces memory", async () => {
        const fakeFactory = {
            open: () => {
                const request: any = {};
                queueMicrotask(() => {
                    request.onerror?.();
                });
                return request;
            },
            deleteDatabase: () => {
                const request: any = {};
                queueMicrotask(() => request.onsuccess?.());
                return request;
            },
        };
        Object.defineProperty(globalThis, "indexedDB", {
            value: fakeFactory,
            configurable: true,
            writable: true,
        });

        const effective = await OfflineCacheStorageService.resolveEffectiveBackend("indexeddb");
        expect(effective).toBe("memory");
        expect(OfflineCacheStorageService.isForcedFallback()).toBe(true);
    });
});
