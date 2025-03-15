import { openDB, type DBSchema } from 'idb';
import type { DecryptedDataCachingHandlerInterface } from '@binsky/passman-client-ts/lib/Interfaces/DecryptedDataCachingHandlerInterface';
import type { IDBPDatabase } from 'idb';

interface DecryptedDataPassmanExtensionDB extends DBSchema {
    decryptedCredentialData: {
        value: {
            cacheName: string;
            key: string;
            value: string | number | boolean | null;
        };
        key: string[];
        indexes: {
            'by-cacheName': string;
            'by-key': string;
        };
    };
}

export class CustomIndexedDBService implements DecryptedDataCachingHandlerInterface {
    private static readonly DB_NAME = 'passman_cache_db';
    private static readonly DB_VERSION = 1;
    private db: IDBPDatabase<DecryptedDataPassmanExtensionDB> | null = null;

    private async getDB(): Promise<IDBPDatabase<DecryptedDataPassmanExtensionDB>> {
        if (this.db) {
            return this.db;
        }

        this.db = await openDB<DecryptedDataPassmanExtensionDB>(CustomIndexedDBService.DB_NAME, CustomIndexedDBService.DB_VERSION, {
            upgrade(db) {
                // Create the object store if it doesn't exist
                if (!db.objectStoreNames.contains('decryptedCredentialData')) {
                    const store = db.createObjectStore('decryptedCredentialData', {
                        keyPath: ['cacheName', 'key']
                    });

                    // Create indexes for efficient querying
                    store.createIndex('by-cacheName', 'cacheName');
                    store.createIndex('by-key', 'key');
                }
            },
            blocked() {
                console.warn('Database upgrade was blocked');
            },
            blocking() {
                console.warn('Database is blocking a newer version');
            },
            terminated: () => {
                console.error('Database connection was terminated');
                this.db = null;
            }
        });

        return this.db;
    }

    async set(cacheName: string, key: string, value: string | number | boolean | null | undefined): Promise<void> {
        const db = await this.getDB();

        if (value === undefined) {
            // Delete the key-value pair if value is undefined
            await db.delete('decryptedCredentialData', [cacheName, key]);
        } else {
            await db.put('decryptedCredentialData', {
                cacheName,
                key,
                value
            });
        }
    }

    async get(cacheName: string, key: string): Promise<string | number | boolean | null | undefined> {
        const db = await this.getDB();
        const entry = await db.get('decryptedCredentialData', [cacheName, key]);
        return entry?.value;
    }

    async clearCacheByName(cacheName: string): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction('decryptedCredentialData', 'readwrite');
        const store = tx.store;
        const index = store.index('by-cacheName');

        // Get all entries for this cache name
        let cursor = await index.openCursor(cacheName);
        
        // Delete all matching entries
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }

        await tx.done;
    }
}

// Export a singleton instance
export const customIndexedDBService = new CustomIndexedDBService();
export default customIndexedDBService;

