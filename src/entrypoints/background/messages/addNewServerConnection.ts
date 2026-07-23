import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { BackendPassmanClient } from "~/lib/BackendPassmanClient";
import CustomStorageService from "~/services/CustomStorageService";
import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";

export interface AddNewServerConnectionRequest extends NextcloudServerInfoInterface {
    /** When true (default), the new/updated connection becomes the active one. */
    makeActive?: boolean;
}

export interface AddNewServerConnectionResponse {
    status: boolean;
    message: string;
    vaultSelectionList: { guid: string, name: string }[];
    connectionId?: string;
}

onMessage('addNewServerConnection', async (message) => {
    let status = false;
    let responseMessage = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];
    let connectionId: string | undefined;

    try {
        if (!message.data) {
            return {
                status: false,
                message: i18n.getMessage('no_server_info_provided'),
                vaultSelectionList
            };
        }

        const { makeActive: makeActiveFlag, ...rawServerData } = message.data;
        const makeActive = makeActiveFlag !== false;
        // Mutable copy — createInstance/addConnection may set backendAppId via probing
        const serverData: NextcloudServerInfoInterface = {
            baseUrl: rawServerData.baseUrl,
            user: rawServerData.user,
            token: rawServerData.token,
            persistence: rawServerData.persistence ?? '',
            backendAppId: rawServerData.backendAppId,
        };

        const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();
        let backendPassmanClient = await PassmanClientService.getBackendPassmanClient();

        if (backendPassmanClient) {
            const directoryBefore = await ServerConnectionDirectoryService.getDirectory();
            const connection = await backendPassmanClient.addConnection(serverData, undefined, undefined, persistence);
            connectionId = connection.connectionId;
            const wasAlreadyInDirectory = directoryBefore.connections.some(
                (c) => PassmanServerConnection.buildConnectionId(c) === connectionId
            );

            if (await connection.preloadVaults(true)) {
                await ServerConnectionDirectoryService.upsertServerConnection(serverData, makeActive);
                if (makeActive) {
                    backendPassmanClient.setActiveConnection(connectionId);
                    await ServerConnectionDirectoryService.syncActiveConnectionMirrors(connectionId);
                }

                for (const preloadedVault of connection.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }
                status = true;
                responseMessage = i18n.getMessage('login_succeeded');
            } else {
                if (wasAlreadyInDirectory) {
                    // addConnection overwrote the in-memory entry; rebuild from persisted directory
                    PassmanClientService.invalidatePassmanClients();
                } else {
                    backendPassmanClient.removeConnection(connectionId);
                }
                responseMessage = i18n.getMessage('login_failed');
            }
        } else {
            backendPassmanClient = await BackendPassmanClient.createInstance(
                serverData,
                undefined,
                undefined,
                persistence
            );

            if (await backendPassmanClient.preloadVaults(true)) {
                connectionId = backendPassmanClient.activeConnection.connectionId;
                PassmanClientService.updateBackendPassmanClient(backendPassmanClient);
                await ServerConnectionDirectoryService.upsertServerConnection(serverData, true);
                await ServerConnectionDirectoryService.syncActiveConnectionMirrors(connectionId);

                for (const preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }
                status = true;
                responseMessage = i18n.getMessage('login_succeeded');
            } else {
                responseMessage = i18n.getMessage('login_failed');
            }
        }
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            responseMessage = e.message;
        } else {
            responseMessage = i18n.getMessage('unknown_error');
        }
    }

    return {
        status,
        message: responseMessage,
        vaultSelectionList,
        connectionId
    };
});
