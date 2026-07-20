import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { onMessage } from '../messaging';

export interface SetDefaultVaultRequest {
    guid: string;
    password: string | null;
}

export interface SetDefaultVaultResponse {
    status: boolean;
    errorMessage: string | null;
}

onMessage('setDefaultVault', async (message) => {
    let status = false;
    let errorMessage = null;

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            await backendPassmanClient.preloadVaults(true, true);
            // do not request cached vault here to prevent calling vault.refresh() later on it
            return await backendPassmanClient.getFullVaultByGuid(message.data.guid).then(async (vault) => {
                if (vault) {
                    // await vault.refresh();
                    if (!!message.data.password && vault.testVaultKey(message.data.password)) {
                        status = true;
                        vault.vaultKey = message.data.password;
                        await ServerConnectionDirectoryService.setDefaultVaultForActiveConnection({
                            guid: message.data.guid,
                            name: vault.name,
                            password: message.data.password
                        });
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

    return {
        status,
        errorMessage
    };
});
