import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { onMessage } from '../messaging';

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
            errorMessage = "No connectionId provided";
            return { status, errorMessage };
        }

        const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
        if (!backendPassmanClient) {
            errorMessage = "Could not get passman client";
            return { status, errorMessage };
        }

        if (!backendPassmanClient.getConnection(connectionId)) {
            errorMessage = `No managed connection with id ${connectionId}`;
            return { status, errorMessage };
        }

        backendPassmanClient.setActiveConnection(connectionId);
        await ServerConnectionDirectoryService.syncActiveConnectionMirrors(connectionId);
        status = true;
    } catch (e) {
        console.error(e);
        errorMessage = e instanceof Error ? e.message : "Unknown error";
    }

    return { status, errorMessage };
});
