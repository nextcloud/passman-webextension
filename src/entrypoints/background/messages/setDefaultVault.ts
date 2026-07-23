import PassmanClientService from "~/services/PassmanClientService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";

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
                        errorMessage = i18n.getMessage('vault_decrypt_failed_with_password');
                        console.error(errorMessage);
                    }
                } else {
                    errorMessage = i18n.getMessage('could_not_get_selected_vault_by_guid');
                    console.error(errorMessage);
                }
            });
        } else {
            errorMessage = i18n.getMessage('could_not_get_passman_client');
            console.error(errorMessage);
        }
    });

    return {
        status,
        errorMessage
    };
});
