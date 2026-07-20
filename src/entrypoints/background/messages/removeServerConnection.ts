import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { onMessage } from '../messaging';

export interface RemoveServerConnectionRequest {
    connectionId: string;
}

export interface RemoveServerConnectionResponse {
    status: boolean;
    errorMessage: string | null;
    activeConnectionId?: string;
}

onMessage('removeServerConnection', async (message) => {
    let status = false;
    let errorMessage: string | null = null;
    let activeConnectionId: string | undefined;

    try {
        const connectionId = message.data?.connectionId;
        if (!connectionId) {
            errorMessage = "No connectionId provided";
            return { status, errorMessage };
        }

        const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
        activeConnectionId = await ServerConnectionDirectoryService.removeServerConnection(connectionId);

        if (backendPassmanClient) {
            backendPassmanClient.removeConnection(connectionId);
            if (backendPassmanClient.getConnection(activeConnectionId)) {
                backendPassmanClient.setActiveConnection(activeConnectionId);
            }
        }

        status = true;
    } catch (e) {
        console.error(e);
        errorMessage = e instanceof Error ? e.message : "Unknown error";
    }

    return { status, errorMessage, activeConnectionId };
});
