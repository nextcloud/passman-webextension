import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export interface SetActiveServerConnectionRequest {
    connectionId: string;
}

export interface SetActiveServerConnectionResponse {
    status: boolean;
    errorMessage: string | null;
}

onMessage('setActiveServerConnection', async (message) => {
    let status = false;
    let errorMessage: string | null = null;

    try {
        const connectionId = message.data?.connectionId;
        if (!connectionId) {
            errorMessage = i18n.getMessage('no_connection_id_provided');
            return { status, errorMessage };
        }

        const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
        if (!backendPassmanClient) {
            errorMessage = i18n.getMessage('could_not_get_passman_client');
            return { status, errorMessage };
        }

        if (!backendPassmanClient.getConnection(connectionId)) {
            errorMessage = i18n.getMessage('no_managed_connection_with_id', [connectionId]);
            return { status, errorMessage };
        }

        backendPassmanClient.setActiveConnection(connectionId);
        await ServerConnectionDirectoryService.syncActiveConnectionMirrors(connectionId);
        status = true;
    } catch (e) {
        logger.error(e);
        errorMessage = e instanceof Error ? e.message : i18n.getMessage('unknown_error');
    }

    return { status, errorMessage };
});
