import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService from "~services/ExtensionSettingsService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let vaultSelectionList: { guid: string, name: string }[] = [];

    await ExtensionSettingsService.getPassmanClient().then(async (passmanClient) => {
        if (passmanClient) {
            try {
                await passmanClient.refreshVaults(true, true);

                for (let vault of passmanClient.vaults) {
                    vaultSelectionList.push({
                        guid: vault.guid,
                        name: vault.name
                    });
                }
                status = true;
            } catch (exception) {
                console.error(exception);
                errorMessage = exception.message;
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
