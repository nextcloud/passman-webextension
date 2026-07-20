import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import ExtensionUnlockService from "~/services/ExtensionUnlockService";
import { onMessage } from '../messaging';

export interface UnlockExtensionRequest {
    extensionUnlockPassword: string;
    refreshAfterUnlock: boolean;
}

export interface UnlockExtensionResponse {
    status: boolean;
}

/**
 * The extension frontend can be locked from the frontend itself, but it should additionally call this messaging endpoint,
 * to ensure the decrypted cache within the background service worker will be cleared without delay.
 * @param req
 * @param res
 */
onMessage('unlockExtension', async (message) => {
    let status = false;
    try {
        status = await ExtensionUnlockService.unlock(message.data.extensionUnlockPassword);

        if (status && message.data.refreshAfterUnlock) {
            try {
                const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
                console.log("backendPassmanClient", backendPassmanClient);

                if (backendPassmanClient) {
                    const defaultVaultInfo = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo);

                    if (defaultVaultInfo) {
                        await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, false);
                        await backendPassmanClient.preloadVaults();
                    } else {
                        console.error('No vault info provided by ExtensionSettingsService.getPartialExtensionSettings');
                    }
                }
            } catch (exception) {
                console.error('Could not get or decrypt vault:', exception);
                // Don't fail the entire unlock process if vault refresh fails
            }
        }
    } catch (error) {
        console.error('Error in unlockExtension handler:', error);
    }

    return {
        status
    };
});
