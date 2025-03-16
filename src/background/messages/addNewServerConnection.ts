import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { BackendPassmanClient } from "~lib/BackendPassmanClient";

const handler: PlasmoMessaging.MessageHandler<NextcloudServerInfoInterface> = async (req, res) => {
    let status = false;
    let message = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];

    try {
        if (req.body) {
            const backendPassmanClient = await BackendPassmanClient.createInstance(req.body);
            if (await backendPassmanClient.preloadVaults(true)) {
                ExtensionSettingsService.updateBackendPassmanClient(backendPassmanClient);
                await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo, req.body);

                for (let preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }

                status = true;
                message = "Login succeeded";
            } else {
                message = "Login failed";
            }
        } else {
            message = "No server info provided";
        }
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            message = e.message;
        } else {
            message = "Unknown error";
        }
    }

    res.send({
        status,
        message,
        vaultSelectionList
    })
}

export default handler
