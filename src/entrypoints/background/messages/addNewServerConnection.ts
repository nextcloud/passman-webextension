import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { BackendPassmanClient } from "~/lib/BackendPassmanClient";
import { onMessage } from '../messaging';

export type AddNewServerConnectionRequest = NextcloudServerInfoInterface;

export interface AddNewServerConnectionResponse {
    status: boolean;
    message: string;
    vaultSelectionList: { guid: string, name: string }[];
}

onMessage('addNewServerConnection', async (message) => {
    let status = false;
    let responseMessage = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];

    try {
        if (message.data) {
            const backendPassmanClient = await BackendPassmanClient.createInstance(message.data);
            if (await backendPassmanClient.preloadVaults(true)) {
                ExtensionSettingsService.updateBackendPassmanClient(backendPassmanClient);
                await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo, message.data);

                for (let preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }

                status = true;
                responseMessage = "Login succeeded";
            } else {
                responseMessage = "Login failed";
            }
        } else {
            responseMessage = "No server info provided";
        }
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            responseMessage = e.message;
        } else {
            responseMessage = "Unknown error";
        }
    }

    return {
        status,
        message: responseMessage,
        vaultSelectionList
    };
});
