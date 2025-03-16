import { PassmanClient } from "@binsky/passman-client-ts/lib/PassmanClient";
import type { LoggingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/LoggingHandlerInterface";
import type { NextcloudServerInfoInterface } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import type { NextcloudServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInterface";
import type { PersistenceInterface } from "@binsky/passman-client-ts/lib/Interfaces/PersistenceInterface";
import { NextcloudServer } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";

export class BackendPassmanClient extends PassmanClient {
    public static createInstance = async (
        serverData: NextcloudServerInfoInterface, 
        nextcloudServer?: NextcloudServerInterface, 
        logger?: LoggingHandlerInterface, 
        persistence?: PersistenceInterface
    ): Promise<BackendPassmanClient> => {
        if (persistence?.autoRestoreOnReconstruction()) {
            let passmanClient = new this(serverData, nextcloudServer ?? new NextcloudServer(serverData, logger, persistence), logger, persistence);
            await passmanClient.restoreFromCacheHandler(persistence.getRequestCacheHandler());
            return passmanClient;
        } else {
            return new this(serverData, nextcloudServer, logger, persistence);
        }
    };

    get fullFeaturedVaultObjectCache() {
        return this._fullFeaturedVaultObjectCache;
    }
}
