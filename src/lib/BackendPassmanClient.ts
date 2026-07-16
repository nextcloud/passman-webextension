import { PassmanClient } from "@binsky/passman-client-ts/lib/PassmanClient";
import type { LoggingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/LoggingHandlerInterface";
import type { NextcloudServerInfoInterface } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import type { NextcloudServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInterface";
import type { PersistenceInterface } from "@binsky/passman-client-ts/lib/Interfaces/PersistenceInterface";
import { NextcloudServer } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";
import { DefaultLoggingService } from "@binsky/passman-client-ts/lib/Service/DefaultLoggingService";

export class BackendPassmanClient extends PassmanClient {
    public static createInstance = async (
        serverData: NextcloudServerInfoInterface,
        nextcloudServer?: NextcloudServerInterface,
        logger?: LoggingHandlerInterface,
        persistence?: PersistenceInterface
    ): Promise<BackendPassmanClient> => {
        // automatic probing if backendAppId is not explicitly set
        if (!serverData.backendAppId) {
            const successfulProbing = await this.getServerBackendAppId(serverData);
            if (successfulProbing) {
                serverData.backendAppId = successfulProbing;
                nextcloudServer?.setTemporaryBackendAppId(successfulProbing);
            }
        }

        if (!logger) {
            logger = new DefaultLoggingService()
        }
        if (persistence?.autoRestoreOnReconstruction()) {
            if (persistence.getModelStore() === undefined && persistence.getRequestCacheHandler() === undefined) {
                throw new Error("autoRestoreOnReconstruction() is enabled but neither a model store nor a request cache handler is configured. Provide getModelStore() (preferred) or getRequestCacheHandler(), or disable autoRestoreOnReconstruction() from the PersistenceInterface.");
            }
            const passmanClient = new this(serverData, nextcloudServer ?? new NextcloudServer(serverData, logger, persistence), logger, persistence);
            await passmanClient.activeConnection.restore();
            return passmanClient;
        } else {
            return new this(serverData, nextcloudServer, logger, persistence);
        }
    };

    /**
     * This is a vault feature and should not be used / placed in this class. Todo: check usage and migrate if required.
     * @deprecated validate if this is really required where it is used; add the use-case to this comment
     */
    get fullFeaturedVaultObjectCache() {
        // try direct access to the protected property
        return this.activeConnection?.['_fullFeaturedVaultObjectCache'];
    }
}
