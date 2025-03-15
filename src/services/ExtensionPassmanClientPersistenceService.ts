import type { PersistenceInterface } from "@binsky/passman-client-ts/lib/Interfaces/PersistenceInterface";
import type { DecryptedDataCachingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/DecryptedDataCachingHandlerInterface";
import type { RequestCachingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/RequestCachingHandlerInterface";

export default class ExtensionPassmanClientPersistenceService implements PersistenceInterface {
    constructor(
        private readonly restoreOnReconstruction: boolean,
        private readonly cachingHandler: RequestCachingHandlerInterface,
        private readonly decryptedDataCachingHandler: DecryptedDataCachingHandlerInterface
    ) {
    }
    autoRestoreOnReconstruction(): boolean {
        return this.restoreOnReconstruction;
    }
    getRequestCacheHandler(): RequestCachingHandlerInterface | undefined {
        return this.cachingHandler;
    }
    getDecryptedDataCacheHandler(): DecryptedDataCachingHandlerInterface | undefined {
        return this.decryptedDataCachingHandler;
    }
}
