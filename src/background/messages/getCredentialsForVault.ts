import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type { EncryptedOwnedCredentialFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedOwnedCredentialFromServerInterface";
import type { SpacialCredentialFieldsToUpdateForServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedOwnedCredentialToUpdateForServerInterface";
import type { SerializableTransferCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/SerializableTransferCredentialInterface";

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

const handler: PlasmoMessaging.MessageHandler<GetCredentialsForVaultMessagingRequest, GetCredentialsForVaultMessagingResponse> = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let serializedCredentials: SerializableTransferCredentialInterface[] = [];
    console.log("handler", req);

    await ExtensionSettingsService.getPassmanClient().then(async (passmanClient) => {
        console.log("passmanClient", passmanClient);
        if (passmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    if (defaultVaultInfo) {
                        // get from cache by default except no-cache is explicitly requested
                        console.log("getCachedIfPossible", req.body?.getCachedIfPossible);
                        let myVault = await passmanClient.getFullVaultByGuid(defaultVaultInfo.guid, req.body?.getCachedIfPossible === true);
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

    res.send({
        status,
        errorMessage,
        serializedCredentials
    })
}

export default handler
