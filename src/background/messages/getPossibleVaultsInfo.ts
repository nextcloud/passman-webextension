import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService from "~services/ExtensionSettingsService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let vaultSelectionList: { guid: string, name: string }[] = [];

    await ExtensionSettingsService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            try {
                await backendPassmanClient.preloadVaults(true, req?.body?.getCachedIfPossible === true);

                for (let preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }
                status = true;
            } catch (exception) {
                console.error(exception);
                if (exception instanceof Error) {
                    errorMessage = exception.message;
                } else {
                    errorMessage = "Unknown error";
                }
            }
        } else {
            errorMessage = "setDefaultVault message: could not get passman client";
            console.error(errorMessage);
        }
    });

    res.send({
        status,
        errorMessage,
        vaultSelectionList
    })
}

export default handler
