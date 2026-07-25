import { PassmanClient } from "@binsky/passman-client-ts";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";
import { NextcloudServerMessagingConnector } from "@/lib/NextcloudServerMessagingConnector";
import { BackendPassmanClient } from "@/lib/BackendPassmanClient";
import CustomStorageService from "./CustomStorageService";
import { CustomPopupPassmanClientLoggingService } from "./frontend/CustomPassmanClientLoggingService";
import ServerConnectionDirectoryService from "./ServerConnectionDirectoryService";
import { logger } from "@/services/ConsoleLoggingService";

/**
 * In-memory PassmanClient lifecycle for both backend and popup JS realms.
 *
 * Keeps one long-lived client per realm and mutates it via addConnection / setActiveConnection / removeConnection.
 * Persisted connection directory lives in {@link ServerConnectionDirectoryService}.
 */
export default class PassmanClientService {   
    private static backendPassmanClient: BackendPassmanClient | null = null;
    private static popupPassmanClient: PassmanClient | null = null;

    protected static bootstrapBackendPassmanClient = async (
        connections: NextcloudServerInfoInterface[],
        activeConnectionId: string | null
    ): Promise<BackendPassmanClient | null> => {
        if (connections.length === 0) {
            return null;
        }

        const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();
        const [first, ...rest] = connections;
        const client = await BackendPassmanClient.createInstance(first, undefined, undefined, persistence);

        for (const serverData of rest) {
            await client.addConnection(serverData, undefined, undefined, persistence);
        }

        const targetId = activeConnectionId && client.getConnection(activeConnectionId)
            ? activeConnectionId
            : client.activeConnection.connectionId;
        client.setActiveConnection(targetId);

        return client;
    };

    protected static bootstrapPopupPassmanClient = async (
        connections: NextcloudServerInfoInterface[],
        activeConnectionId: string | null
    ): Promise<PassmanClient | null> => {
        if (connections.length === 0) {
            return null;
        }

        const logger = new CustomPopupPassmanClientLoggingService();
        const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();
        const [first, ...rest] = connections;
        // Shared IndexedDB model store with the background client; restore fills preloaded/full vaults offline
        const client = await PassmanClient.createInstance(
            first,
            new NextcloudServerMessagingConnector(first, logger),
            logger,
            persistence
        );

        for (const serverData of rest) {
            await client.addConnection(
                serverData,
                new NextcloudServerMessagingConnector(serverData, logger),
                logger,
                persistence
            );
        }

        const targetId = activeConnectionId && client.getConnection(activeConnectionId)
            ? activeConnectionId
            : client.activeConnection.connectionId;
        client.setActiveConnection(targetId);

        return client;
    };

    /**
     * Incrementally sync an existing client's connection map to the persisted directory.
     * @param useMessagingConnector popup clients need NextcloudServerMessagingConnector per connection
     */
    protected static syncClientRoster = async (
        client: PassmanClient,
        connections: NextcloudServerInfoInterface[],
        activeConnectionId: string | null,
        useMessagingConnector: boolean
    ): Promise<void> => {
        const directoryById = new Map(
            connections.map((c) => [PassmanServerConnection.buildConnectionId(c), c] as const)
        );

        for (const managed of [...client.connections]) {
            if (!directoryById.has(managed.connectionId)) {
                client.removeConnection(managed.connectionId);
            }
        }

        const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();
        for (const [connectionId, serverData] of directoryById) {
            if (client.getConnection(connectionId)) {
                continue;
            }
            if (useMessagingConnector) {
                const logger = new CustomPopupPassmanClientLoggingService();
                await client.addConnection(
                    serverData,
                    new NextcloudServerMessagingConnector(serverData, logger),
                    logger,
                    persistence
                );
            } else {
                await client.addConnection(serverData, undefined, undefined, persistence);
            }
        }

        if (activeConnectionId && client.getConnection(activeConnectionId)) {
            client.setActiveConnection(activeConnectionId);
        } else if (client.connections.length > 0) {
            client.setActiveConnection(client.connections[0].connectionId);
        }
    };

    /**
     * Select the active connection on any PassmanClient cached in this JS realm.
     * No-op if no client exists or the id is not managed (next get* will bootstrap/sync).
     */
    public static applyActiveConnectionLocally = (connectionId: string): void => {
        if (PassmanClientService.backendPassmanClient?.getConnection(connectionId)) {
            PassmanClientService.backendPassmanClient.setActiveConnection(connectionId);
        }
        if (PassmanClientService.popupPassmanClient?.getConnection(connectionId)) {
            PassmanClientService.popupPassmanClient.setActiveConnection(connectionId);
        }
    };

    /**
     * Upsert a connection onto any PassmanClient cached in this JS realm (addConnection).
     * If no client exists yet, leave null and the next get* will bootstrap from the directory.
     * 
     * Can be called from both backend and popup JS realms.
     */
    public static ensureConnectionLocally = async (
        serverData: NextcloudServerInfoInterface,
        makeActive: boolean
    ): Promise<void> => {
        const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();

        if (PassmanClientService.backendPassmanClient) {
            const connection = await PassmanClientService.backendPassmanClient.addConnection(
                serverData,
                undefined,
                undefined,
                persistence
            );
            if (makeActive) {
                PassmanClientService.backendPassmanClient.setActiveConnection(connection.connectionId);
            }
        }

        if (PassmanClientService.popupPassmanClient) {
            const logger = new CustomPopupPassmanClientLoggingService();
            const popupServerData: NextcloudServerInfoInterface = { ...serverData };
            const connection = await PassmanClientService.popupPassmanClient.addConnection(
                popupServerData,
                new NextcloudServerMessagingConnector(popupServerData, logger),
                logger,
                persistence
            );
            if (makeActive) {
                PassmanClientService.popupPassmanClient.setActiveConnection(connection.connectionId);
            }
        }
    };

    /**
     * Remove a connection from any PassmanClient cached in this JS realm and select nextActiveId.
     */
    public static dropConnectionLocally = (connectionId: string, nextActiveId: string): void => {
        if (PassmanClientService.backendPassmanClient) {
            PassmanClientService.backendPassmanClient.removeConnection(connectionId);
            if (PassmanClientService.backendPassmanClient.getConnection(nextActiveId)) {
                PassmanClientService.backendPassmanClient.setActiveConnection(nextActiveId);
            }
        }
        if (PassmanClientService.popupPassmanClient) {
            PassmanClientService.popupPassmanClient.removeConnection(connectionId);
            if (PassmanClientService.popupPassmanClient.getConnection(nextActiveId)) {
                PassmanClientService.popupPassmanClient.setActiveConnection(nextActiveId);
            }
        }
    };

    public static getBackendPassmanClient = async () => {
        const { connections, activeConnectionId } = await ServerConnectionDirectoryService.getDirectory();

        if (PassmanClientService.backendPassmanClient) {
            try {
                await PassmanClientService.syncClientRoster(
                    PassmanClientService.backendPassmanClient,
                    connections,
                    activeConnectionId,
                    false
                );
                return PassmanClientService.backendPassmanClient;
            } catch (e) {
                logger.error('Failed to sync backend PassmanClient roster; bootstrapping fresh', e);
                PassmanClientService.backendPassmanClient = null;
            }
        }

        PassmanClientService.backendPassmanClient = await PassmanClientService.bootstrapBackendPassmanClient(
            connections,
            activeConnectionId
        );

        return PassmanClientService.backendPassmanClient;
    };

    public static getPopupPassmanClient = async () => {
        const { connections, activeConnectionId } = await ServerConnectionDirectoryService.getDirectory();

        if (PassmanClientService.popupPassmanClient) {
            try {
                await PassmanClientService.syncClientRoster(
                    PassmanClientService.popupPassmanClient,
                    connections,
                    activeConnectionId,
                    true
                );
                return PassmanClientService.popupPassmanClient;
            } catch (e) {
                logger.error('Failed to sync popup PassmanClient roster; bootstrapping fresh', e);
                PassmanClientService.popupPassmanClient = null;
            }
        }

        PassmanClientService.popupPassmanClient = await PassmanClientService.bootstrapPopupPassmanClient(
            connections,
            activeConnectionId
        );

        return PassmanClientService.popupPassmanClient;
    };

    public static updateBackendPassmanClient = (backendPassmanClient: BackendPassmanClient | null) => {
        PassmanClientService.backendPassmanClient = backendPassmanClient;
    };

    public static updatePopupPassmanClient = (popupPassmanClient: PassmanClient | null) => {
        PassmanClientService.popupPassmanClient = popupPassmanClient;
    };

    /**
     * Full teardown. Use on lock (clear decrypted state) or failed-login recovery.
     * Do not use for switch/add/remove; mutate connections instead.
     */
    public static invalidatePassmanClients = () => {
        PassmanClientService.backendPassmanClient = null;
        PassmanClientService.popupPassmanClient = null;
    };
}
