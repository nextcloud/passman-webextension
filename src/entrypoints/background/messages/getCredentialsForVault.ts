import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import type {
    SerializableTransferCredentialInterface
} from "@binsky/passman-client-ts/lib/Interfaces/Credential/SerializableTransferCredentialInterface";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export type GetCredentialsForVaultMessagingConfiguration = {
    vaultGuid: string
}

export type GetCredentialsForVaultMessagingRequest = {
    getCachedIfPossible?: boolean
    /** Returns a single credential by guid in the serializedCredentials array, if provided. */
    guid?: string
}

export type GetCredentialsForVaultMessagingResponse = {
    status: boolean,
    errorMessage: string | null,
    serializedCredentials: SerializableTransferCredentialInterface[]
}

onMessage('getCredentialsForVault', async (message) => {
    let status = false;
    let errorMessage = null;
    let serializedCredentials: SerializableTransferCredentialInterface[] = [];
    logger.log("handler", message);

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        logger.log("backendPassmanClient", backendPassmanClient);
        if (backendPassmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    if (defaultVaultInfo) {
                        // get from cache by default except no-cache is explicitly requested
                        logger.log("getCachedIfPossible", message.data?.getCachedIfPossible);
                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, message.data?.getCachedIfPossible === true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                logger.log("refresh vault");
                                await myVault.refresh();
                            }

                            const guid = message.data?.guid;
                            if (guid) {
                                const credential = myVault.getCredentialByGuid(guid);
                                if (credential) {
                                    serializedCredentials = [credential.getAsSerializable()];
                                    status = true;
                                } else {
                                    errorMessage = i18n.getMessage('could_not_find_selected_credential');
                                }
                            } else {
                                for (const credential of myVault.credentials) {
                                    serializedCredentials.push(credential.getAsSerializable());
                                }
                                status = true;
                            }
                        } else if (myVault) {
                            errorMessage = i18n.getMessage('could_not_decrypt_vault');
                        } else {
                            errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                        }
                    } else {
                        errorMessage = i18n.getMessage('no_vault_info_in_extension_settings');
                    }
                } catch (exception) {
                    errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                }
            });
        }
    });

    return {
        status,
        errorMessage,
        serializedCredentials
    };
});
