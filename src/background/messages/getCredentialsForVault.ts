import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
import type {
    EncryptedCredentialInterface
} from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedCredentialInterface";

export type GetCredentialsForVaultMessagingConfiguration = {
    vaultGuid: string
}

export type GetCredentialsForVaultMessagingResponse = {
    status: boolean,
    errorMessage: string | null,
    encryptedCredentialsData: EncryptedCredentialInterface[]
}

const handler: PlasmoMessaging.MessageHandler<null, GetCredentialsForVaultMessagingResponse> = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let encryptedCredentialsData: EncryptedCredentialInterface[] = [];

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

                        for (const credential of myVault.credentials) {
                            encryptedCredentialsData.push(credential.getEncrypted());
                        }
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
        encryptedCredentialsData
    })
}

export default handler
