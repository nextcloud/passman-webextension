import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    let status = false;
    let errorMessage = null;

    await ExtensionSettingsService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            await backendPassmanClient.preloadVaults(true, true);
            // do not request cached vault here to prevent calling vault.refresh() later on it
            return await backendPassmanClient.getFullVaultByGuid(req.body.guid).then(async (vault) => {
                if (vault) {
                    // await vault.refresh();
                    if (vault.testVaultKey(req.body.password)) {
                        status = true;
                        vault.vaultKey = req.body.password;
                        await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo, {
                            guid: req.body.guid,
                            password: req.body.password
                        })
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
