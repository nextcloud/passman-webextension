import CustomStorageService from "@/services/CustomStorageService";
import { logger } from "@/services/ConsoleLoggingService";

/**
 * Where the auto-unlock key is kept.
 * - `indexeddb`: the preferred backend. The key is held as a non-extractable {@link CryptoKey} object,
 *   so its raw bytes are never observable from JavaScript, a storage dump, an export or a sync.
 * - `local`: fallback for profiles that block IndexedDB (for example Firefox "Never remember history").
 *   `browser.storage.local` can only hold JSON, so the raw key bytes have to be stored next to the
 *   wrapped storage key. Anyone who can read the extension storage can then unwrap the storage key.
 */
export type AutoUnlockKeyStorageBackend = "indexeddb" | "local";

export interface AutoUnlockKeyHandle {
    key: CryptoKey;
    backend: AutoUnlockKeyStorageBackend;
}

const DB_NAME = "passman-auto-unlock";
const DB_VERSION = 1;
const OBJECT_STORE_NAME = "keys";
const KEY_RECORD_ID = "autoUnlockKey";
const PROBE_RECORD_ID = "autoUnlockKeyProbe";
const LOCAL_FALLBACK_ACCESS_KEY = "autoUnlockKeyFallback";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
        transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
}

function openDatabase(): Promise<IDBDatabase> {
    const factory = globalThis.indexedDB;
    if (!factory) {
        return Promise.reject(new Error("IndexedDB is not available"));
    }

    return new Promise((resolve, reject) => {
        const request = factory.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                request.result.createObjectStore(OBJECT_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onblocked = () => reject(new Error("Opening IndexedDB was blocked by an open connection"));
    });
}

async function putIntoIndexedDb(recordId: string, key: CryptoKey): Promise<void> {
    const db = await openDatabase();
    try {
        const transaction = db.transaction(OBJECT_STORE_NAME, "readwrite");
        transaction.objectStore(OBJECT_STORE_NAME).put(key, recordId);
        await transactionToPromise(transaction);
    } finally {
        db.close();
    }
}

async function getFromIndexedDb(recordId: string): Promise<CryptoKey | undefined> {
    const db = await openDatabase();
    try {
        const transaction = db.transaction(OBJECT_STORE_NAME, "readonly");
        const record = await requestToPromise(transaction.objectStore(OBJECT_STORE_NAME).get(recordId));
        return (record as CryptoKey | undefined) ?? undefined;
    } finally {
        db.close();
    }
}

async function deleteFromIndexedDb(recordId: string): Promise<void> {
    const db = await openDatabase();
    try {
        const transaction = db.transaction(OBJECT_STORE_NAME, "readwrite");
        transaction.objectStore(OBJECT_STORE_NAME).delete(recordId);
        await transactionToPromise(transaction);
    } finally {
        db.close();
    }
}

/**
 * Generate an auto-unlock key. It can only wrap and unwrap the storage key, never encrypt arbitrary data.
 * @param extractable Only the local storage fallback needs the raw bytes
 */
function generateKey(extractable: boolean): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        extractable,
        ["wrapKey", "unwrapKey"]
    );
}

function getLocalStorage() {
    return CustomStorageService.getUnsafeLocalStorage();
}

async function loadFromLocalStorage(): Promise<CryptoKey | undefined> {
    const rawKey = await getLocalStorage().get<string>(LOCAL_FALLBACK_ACCESS_KEY);
    if (!rawKey) {
        return undefined;
    }

    return await crypto.subtle.importKey(
        "raw",
        Uint8Array.from(atob(rawKey), c => c.charCodeAt(0)),
        { name: "AES-GCM" },
        true,
        ["wrapKey", "unwrapKey"]
    );
}

async function storeInLocalStorage(key: CryptoKey): Promise<void> {
    const exported = await crypto.subtle.exportKey("raw", key);
    await getLocalStorage().set(
        LOCAL_FALLBACK_ACCESS_KEY,
        btoa(String.fromCharCode(...new Uint8Array(exported)))
    );
}

/**
 * Report the backend an {@link createAutoUnlockKey} call would use right now.
 * Storing a throwaway key is the only reliable check, as blocked profiles fail on write rather than on open.
 */
export async function probeAutoUnlockKeyStorageBackend(): Promise<AutoUnlockKeyStorageBackend> {
    try {
        await putIntoIndexedDb(PROBE_RECORD_ID, await generateKey(false));
        await deleteFromIndexedDb(PROBE_RECORD_ID);
        return "indexeddb";
    } catch (e) {
        logger.warn("IndexedDB is not usable for the auto-unlock key", e);
        return "local";
    }
}

/**
 * Create and persist a fresh auto-unlock key, replacing any previously stored one.
 */
export async function createAutoUnlockKey(): Promise<AutoUnlockKeyHandle> {
    await deleteAutoUnlockKey();

    if (await probeAutoUnlockKeyStorageBackend() === "indexeddb") {
        try {
            const key = await generateKey(false);
            await putIntoIndexedDb(KEY_RECORD_ID, key);
            return { key, backend: "indexeddb" };
        } catch (e) {
            logger.warn("Failed to store the auto-unlock key in IndexedDB", e);
        }
    }

    const key = await generateKey(true);
    await storeInLocalStorage(key);
    return { key, backend: "local" };
}

/**
 * Load the persisted auto-unlock key, or undefined if none is stored.
 */
export async function loadAutoUnlockKey(): Promise<AutoUnlockKeyHandle | undefined> {
    try {
        const key = await getFromIndexedDb(KEY_RECORD_ID);
        if (key) {
            return { key, backend: "indexeddb" };
        }
    } catch (e) {
        logger.warn("Failed to read the auto-unlock key from IndexedDB", e);
    }

    const fallbackKey = await loadFromLocalStorage();
    return fallbackKey ? { key: fallbackKey, backend: "local" } : undefined;
}

/**
 * Remove the auto-unlock key from both backends, so a backend switch cannot leave a usable key behind.
 */
export async function deleteAutoUnlockKey(): Promise<void> {
    try {
        await deleteFromIndexedDb(KEY_RECORD_ID);
    } catch (e) {
        logger.warn("Failed to remove the auto-unlock key from IndexedDB", e);
    }

    await getLocalStorage().remove(LOCAL_FALLBACK_ACCESS_KEY);
}
