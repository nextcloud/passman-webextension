import PouchDB from 'pouchdb';
import PouchDBMemory from 'pouchdb-adapter-memory';
import PouchDBFind from 'pouchdb-find';
import type { DecryptedDataCachingHandlerInterface } from '@binsky/passman-client-ts/lib/Interfaces/DecryptedDataCachingHandlerInterface';

// Register memory adapter and find plugin
PouchDB.plugin(PouchDBMemory);
PouchDB.plugin(PouchDBFind);

interface CacheDocumentData {
    cacheName: string;  // usually {vaultGuid}_{credentialGuid}
    key: string;        // usually {credentialPropertyName}
    value: string | number | boolean | null;
}

interface CacheDocument extends PouchDB.Core.IdMeta, CacheDocumentData {}

export class CustomIndexedDBService implements DecryptedDataCachingHandlerInterface {
    private static readonly DB_NAME = 'passman_cache_db';
    private db: PouchDB.Database<CacheDocument>;
    private static instance: CustomIndexedDBService | null = null;

    /**
     * @param useMemoryAdapter - Whether to use the memory adapter (default is true)
     */
    constructor(useMemoryAdapter: boolean = true) {
        // Creates a database or opens an existing one
        this.db = new PouchDB<CacheDocument>(CustomIndexedDBService.DB_NAME, {
            adapter: useMemoryAdapter ? 'memory' : 'idb'
        });

        // Create indexes for efficient querying (does nothing if it already exists)
        this.db.createIndex({
            index: {
                fields: ['cacheName', 'key']
            }
        }).catch((error: Error) => {
            console.error('Failed to create index:', error);
        });
    }

    public static getInstance(useMemoryAdapter: boolean = true): CustomIndexedDBService {
        if (!CustomIndexedDBService.instance) {
            CustomIndexedDBService.instance = new CustomIndexedDBService(useMemoryAdapter);
        }
        return CustomIndexedDBService.instance;
    }

    private getDocId(cacheName: string, key: string): string {
        return `${cacheName}:${key}`;
    }

    async set(cacheName: string, key: string, value: string | number | boolean | null | undefined): Promise<void> {
        const docId = this.getDocId(cacheName, key);

        if (value === undefined) {
            // Delete the document if value is undefined
            // (when we may use revisions with _rev later, we can't just remove the document, but it's fine for now)
            try {
                const doc = await this.db.get(docId);
                await this.db.remove(doc);
            } catch (error) {
                // Document might not exist, which is fine
                if (error instanceof Error && error.name !== 'not_found') {
                    console.error('Error deleting document:', error);
                }
            }
        } else {
            try {
                const newDoc: CacheDocument | CacheDocument & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta = {
                    _id: docId,
                    cacheName,
                    key,
                    value
                };

                // Try to get existing document to get _rev
                let existingDoc: CacheDocument & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta | null = null;
                try {
                    existingDoc = await this.db.get(docId);
                } catch (error) {
                    if (error instanceof Error && error.name !== 'not_found') {
                        throw error;
                    }
                }

                if (existingDoc) {
                    await this.db.put({
                        ...newDoc,
                        _rev: existingDoc._rev
                    });
                } else {
                    await this.db.put(newDoc);
                }
            } catch (error) {
                console.error('Error setting document:', error);
                throw error;
            }
        }
    }

    async get(cacheName: string, key: string): Promise<string | number | boolean | null | undefined> {
        const docId = this.getDocId(cacheName, key);

        try {
            const doc = await this.db.get(docId);
            return doc.value;
        } catch (error) {
            if (error instanceof Error && error.name === 'not_found') {
                return undefined;
            }
            console.error('Error getting document:', error);
            throw error;
        }
    }

    async clearCacheByName(cacheName: string): Promise<void> {
        try {
            // Find all documents for the given cacheName
            const result = await this.db.find({
                selector: {
                    cacheName: cacheName
                }
            });

            // Delete all found documents
            await this.db.bulkDocs(
                result.docs.map((doc: CacheDocument) => {
                    return {
                        _deleted: true,
                        ...doc
                    };
                })
            );
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    }

    // Additional utility method to destroy the database (useful for testing)
    async destroy(): Promise<void> {
        await this.db.destroy();
        CustomIndexedDBService.instance = null;
    }
}

// Export a singleton instance with persistent storage by default
export const customIndexedDBService = CustomIndexedDBService.getInstance(true);
export default customIndexedDBService;
