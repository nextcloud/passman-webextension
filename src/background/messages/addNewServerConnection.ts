import type { PlasmoMessaging } from "@plasmohq/messaging"
import { PassmanClient } from "@binsky/passman-client-ts";
import ExtensionSettingsService from "~services/ExtensionSettingsService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";

const handler: PlasmoMessaging.MessageHandler<NextcloudServerInfoInterface> = async (req, res) => {
    let status = false;
    let message = '';
    let vaultSelectionList: { guid: string, name: string }[] = [];

    try {
        const passmanClient = new PassmanClient(req.body);
        if (await passmanClient.refreshVaults(true)) {
            ExtensionSettingsService.updatePassmanClient(passmanClient);
            await ExtensionSettingsService.updateNextcloudServerSettings(req.body);

            for (let vault of passmanClient.vaults) {
                vaultSelectionList.push({
                    guid: vault.guid,
                    name: vault.name
                });
            }

            status = true;
            message = "Login succeeded";
        } else {
            message = "Login failed";
        }
    } catch (e) {
        console.error(e);
        message = e.message;
    }

    res.send({
        status,
        message,
        vaultSelectionList
    })
}

export default handler
