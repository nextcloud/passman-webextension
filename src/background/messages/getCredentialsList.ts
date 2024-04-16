import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";

const getFilteredCredentials = (credentials: Credential[], searchInput: string) => {
    let filtered: Credential[] = [];
    if (searchInput && searchInput.trim() !== '') {
        for (const credential of credentials) {
            if (credential.label.includes(searchInput)) {
                filtered.push(credential);
            }
        }
        return filtered;
    }
    return credentials;
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let credentials: Credential[] = [];

    await ExtensionSettingsService.getPassmanClient().then(async (passmanClient) => {
        if (passmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    let myVault = await passmanClient.getVaultByGuid(defaultVaultInfo.guid);
                    if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                        myVault.vaultKey = defaultVaultInfo.password;
                        if (myVault.credentials.length <= 1) {
                            console.log("refresh vault");
                            await myVault.refresh();
                        }
                        credentials = getFilteredCredentials(myVault.credentials, req.body.searchInput);
                        status = true;
                    } else {
                        errorMessage = 'Could not decrypt vault';
                    }
                } catch (exception) {
                    errorMessage = 'Could not get or decrypt vault';
                }
            });
        }
    });

    res.send({
        status,
        errorMessage,
        credentials
    })
}

export default handler
