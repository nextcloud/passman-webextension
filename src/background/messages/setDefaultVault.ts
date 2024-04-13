import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService from "~services/ExtensionSettingsService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    let status = false;
    let errorMessage = null;

    await ExtensionSettingsService.getPassmanClient().then(async (passmanClient) => {
        if (passmanClient) {
            await passmanClient.refreshVaults(true, true);
            return await passmanClient.getVaultByGuid(req.body.guid).then(async (vault) => {
                if (vault) {
                    await vault.refresh();
                    if (vault.testVaultKey(req.body.password)) {
                        status = true;
                        vault.vaultKey = req.body.password;
                        await ExtensionSettingsService.setDefaultVaultInfo(req.body.guid, req.body.password);
                    } else {
                        errorMessage = "setDefaultVault message: selected vault could not be decrypted with the given password";
                        console.error(errorMessage);
                    }
                } else {
                    errorMessage = "setDefaultVault message: could not get selected vault by guid";
                    console.error(errorMessage);
                }
            });
        } else {
            errorMessage = "setDefaultVault message: could not get passman client";
            console.error(errorMessage);
        }
    });

    res.send({
        status,
        errorMessage
    })
}

export default handler
