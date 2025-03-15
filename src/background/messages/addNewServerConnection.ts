import type { PlasmoMessaging } from "@plasmohq/messaging"
import { PassmanClient } from "@binsky/passman-client-ts";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";

const handler: PlasmoMessaging.MessageHandler<NextcloudServerInfoInterface> = async (req, res) => {
    let status = false;
    let message = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];

    try {
        if (req.body) {
            const passmanClient = await PassmanClient.createInstance(req.body);
            if (await passmanClient.preloadVaults(true)) {
                ExtensionSettingsService.updatePassmanClient(passmanClient);
                await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo, req.body);

                for (let preloadedVault of passmanClient.preloadedVaults) {
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
