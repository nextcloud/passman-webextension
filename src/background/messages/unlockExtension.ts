import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import ExtensionUnlockService from "~services/ExtensionUnlockService";

/**
 * The extension frontend can be locked from the frontend itself, but it should additionally call this messaging endpoint,
 * to ensure the decrypted cache within the background service worker will be cleared without delay.
 * @param req
 * @param res
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const status = await ExtensionUnlockService.unlock(req.body.extensionUnlockPassword);
    if (status && req.body.refreshAfterUnlock) {
        await ExtensionSettingsService.getBackendPassmanClient().then(async (backendPassmanClient) => {
            console.log("backendPassmanClient", backendPassmanClient);
            if (backendPassmanClient) {
                return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    try {
                        if (defaultVaultInfo) {
                            await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, false);
                            backendPassmanClient.preloadVaults();
                        } else {
                            console.error('No vault info provided by ExtensionSettingsService.getPartialExtensionSettings');
                        }
                    } catch (exception) {
                        console.error('Could not get or decrypt vault');
                    }
                });
            }
        });    
    }

    res.send({
        status
    });
}

export default handler
