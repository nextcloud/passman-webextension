import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import type {
    SerializableTransferCredentialInterface
} from "@binsky/passman-client-ts/lib/Interfaces/Credential/SerializableTransferCredentialInterface";
import { onMessage } from '../messaging';

export type GetCredentialsForVaultMessagingConfiguration = {
    vaultGuid: string
}

export type GetCredentialsForVaultMessagingRequest = {
    getCachedIfPossible?: boolean
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
    console.log("handler", message);

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        console.log("backendPassmanClient", backendPassmanClient);
        if (backendPassmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    if (defaultVaultInfo) {
                        // get from cache by default except no-cache is explicitly requested
                        console.log("getCachedIfPossible", message.data?.getCachedIfPossible);
                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, message.data?.getCachedIfPossible === true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                console.log("refresh vault");
                                await myVault.refresh();
                            }

                            for (const credential of myVault.credentials) {
                                serializedCredentials.push(credential.getAsSerializable());
                            }
                            status = true;
                        } else {
                            errorMessage = 'Could not decrypt vault';
                        }
                    } else {
                        errorMessage = 'No vault info provided by ExtensionSettingsService.getPartialExtensionSettings';
                    }
                } catch (exception) {
                    errorMessage = 'Could not get or decrypt vault';
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
