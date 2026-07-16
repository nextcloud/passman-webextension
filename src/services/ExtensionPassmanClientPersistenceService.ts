import type { PersistenceInterface } from "@binsky/passman-client-ts/lib/Interfaces/PersistenceInterface";
import type { DecryptedDataCachingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/DecryptedDataCachingHandlerInterface";
import type { RequestCachingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/RequestCachingHandlerInterface";
import type { ModelStoreInterface } from "@binsky/passman-client-ts/lib/Interfaces/ModelStoreInterface";

/**
 * Extension persistence: IndexedDB model store for vault/credential DTOs (primary),
 * plus an optional in-memory decrypted-field cache. Legacy request-cache is no longer used.
 */
export default class ExtensionPassmanClientPersistenceService implements PersistenceInterface {
    constructor(
        private readonly restoreOnReconstruction: boolean,
        private readonly modelStore: ModelStoreInterface,
        private readonly decryptedDataCachingHandler?: DecryptedDataCachingHandlerInterface
    ) {
    }

    autoRestoreOnReconstruction(): boolean {
        return this.restoreOnReconstruction;
    }

    getModelStore(): ModelStoreInterface {
        return this.modelStore;
    }

    getRequestCacheHandler(): RequestCachingHandlerInterface | undefined {
        return undefined;
    }

    getDecryptedDataCacheHandler(): DecryptedDataCachingHandlerInterface | undefined {
        return this.decryptedDataCachingHandler;
    }
}
