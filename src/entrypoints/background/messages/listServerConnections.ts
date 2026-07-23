import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";
import type { NextcloudServerBackendAppId } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";

export interface ServerConnectionListItem {
    connectionId: string;
    baseUrl: string;
    user: string;
    backendAppId?: NextcloudServerBackendAppId;
    isActive: boolean;
    /** Display name of the saved default vault for this connection, if any. */
    selectedDefaultVaultName?: string;
}

export interface ListServerConnectionsResponse {
    status: boolean;
    connections: ServerConnectionListItem[];
    errorMessage: string | null;
}

onMessage('listServerConnections', async () => {
    let status = false;
    let connections: ServerConnectionListItem[] = [];
    let errorMessage: string | null = null;

    try {
        const directory = await ServerConnectionDirectoryService.getDirectory();
        const vaultByConnection = await ExtensionSettingsService.getPartialExtensionSettings(
            ExtensionSettingsOptions.defaultVaultInfoByConnection
        ) ?? {};
        connections = directory.connections.map((c) => {
            const connectionId = PassmanServerConnection.buildConnectionId(c);
            return {
                connectionId,
                baseUrl: c.baseUrl,
                user: c.user,
                backendAppId: c.backendAppId,
                isActive: connectionId === directory.activeConnectionId,
                selectedDefaultVaultName: vaultByConnection[connectionId]?.name ?? null,
            };
        });
        status = true;
    } catch (e) {
        console.error(e);
        errorMessage = e instanceof Error ? e.message : i18n.getMessage('unknown_error');
    }

    return { status, connections, errorMessage };
});
