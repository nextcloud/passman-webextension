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
import { logger } from "~/services/ConsoleLoggingService";
import { NextcloudServerError } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";

export interface AddNewServerConnectionRequest extends NextcloudServerInfoInterface {
    /** When true (default), the new/updated connection becomes the active one. */
    makeActive?: boolean;
}

export interface AddNewServerConnectionResponse {
    status: boolean;
    message: string;
    vaultSelectionList: { guid: string, name: string }[];
    connectionId?: string;
    /** Final baseUrl after a successful same-host http to https redirect upgrade */
    baseUrl?: string;
}

onMessage('addNewServerConnection', async (message) => {
    let status = false;
    let responseMessage = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];
    let connectionId: string | undefined;
    let baseUrl: string | undefined;

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
        // Mutable copy — createInstance/addConnection may set backendAppId via probing;
        // NextcloudServer may upgrade http to https baseUrl during fetch redirects.
        const serverData: NextcloudServerInfoInterface = {
            baseUrl: rawServerData.baseUrl,
            user: rawServerData.user,
            token: rawServerData.token,
            persistence: rawServerData.persistence ?? '',
            backendAppId: rawServerData.backendAppId ?? 'passman', // default to passman if not provided (to prevent 99% useless attempts to probe other apps for now)
        };

        const persistence = await CustomStorageService.ensureExtensionPassmanClientPersistenceService();
        let backendPassmanClient = await PassmanClientService.getBackendPassmanClient();

        if (backendPassmanClient) {
            const directoryBefore = await ServerConnectionDirectoryService.getDirectory();
            const connection = await backendPassmanClient.addConnection(serverData, undefined, undefined, persistence);
            const previousConnectionId = connection.connectionId;
            const wasAlreadyInDirectory = directoryBefore.connections.some(
                (c) => PassmanServerConnection.buildConnectionId(c) === previousConnectionId
            );

            if (await connection.preloadVaults(true)) {
                connectionId = backendPassmanClient.syncConnectionIdentity(previousConnectionId);
                const replaceConnectionId = connectionId !== previousConnectionId
                    ? previousConnectionId
                    : undefined;
                await ServerConnectionDirectoryService.upsertServerConnection(
                    serverData,
                    makeActive,
                    replaceConnectionId
                );
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
                baseUrl = serverData.baseUrl;
            } else {
                if (wasAlreadyInDirectory) {
                    // addConnection overwrote the in-memory entry; rebuild from persisted directory
                    PassmanClientService.invalidatePassmanClients();
                } else {
                    backendPassmanClient.removeConnection(previousConnectionId);
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

            const previousConnectionId = backendPassmanClient.activeConnection.connectionId;
            if (await backendPassmanClient.preloadVaults(true)) {
                connectionId = backendPassmanClient.syncConnectionIdentity(previousConnectionId);
                const replaceConnectionId = connectionId !== previousConnectionId
                    ? previousConnectionId
                    : undefined;
                PassmanClientService.updateBackendPassmanClient(backendPassmanClient);
                await ServerConnectionDirectoryService.upsertServerConnection(
                    serverData,
                    true,
                    replaceConnectionId
                );
                await ServerConnectionDirectoryService.syncActiveConnectionMirrors(connectionId);

                for (const preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }
                status = true;
                responseMessage = i18n.getMessage('login_succeeded');
                baseUrl = serverData.baseUrl;
            } else {
                responseMessage = i18n.getMessage('login_failed');
            }
        }
    } catch (e) {
        logger.error(e);
        if (e instanceof NextcloudServerError) {
            if (e.statusCode === 401) {
                responseMessage = `${i18n.getMessage('login_failed')} (401)`;
            } else {
                responseMessage = i18n.getMessage('invalid_response_from_server', [
                    e.statusCode ? e.statusCode.toString() : "",
                    e.message?.trim() ?? i18n.getMessage('unknown_error')
                ]);
            }
        } else if (e instanceof Error) {
            responseMessage = e.message || i18n.getMessage('unknown_error');
        } else {
            responseMessage = i18n.getMessage('unknown_error');
        }
    }

    return {
        status,
        message: responseMessage,
        vaultSelectionList,
        connectionId,
        baseUrl
    };
});
