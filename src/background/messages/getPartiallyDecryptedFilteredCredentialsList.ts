import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";

export enum GetCredentialsListMessagingFilterType {
    DEFAULT_SEARCH_FULL_TEXT_LABEL,
    SEARCH_BY_URL
}

export type GetCredentialsListMessagingConfiguration = {
    filterText: string,
    filterType: GetCredentialsListMessagingFilterType
}

export type DecryptedPartialCredentialData = {
    label: string | null,
    username: string | null,
    email: string | null,
    password: string | null,
    otp: string | null | void,   // current OTP, not the secret
}

export type GetCredentialsListMessagingResponse = {
    status: boolean,
    errorMessage: string | null,
    decryptedPartialCredentialData: DecryptedPartialCredentialData[]
}

const handler: PlasmoMessaging.MessageHandler<GetCredentialsListMessagingConfiguration, GetCredentialsListMessagingResponse> = async (req, res) => {
    let status = false;
    let errorMessage = null;
    let filteredCredentials: Credential[] = [];
    let decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

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

                        if (req.body.filterType === GetCredentialsListMessagingFilterType.SEARCH_BY_URL) {
                            filteredCredentials = await CustomCredentialFilterService.getCredentialsByUrl(req.body.filterText, myVault.credentials);
                        } else {
                            filteredCredentials = CustomCredentialFilterService.getCredentialsByLabel(req.body.filterText, myVault.credentials);
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

    for (const filteredCredential of filteredCredentials) {
        decryptedPartialCredentialData.push({
            label: filteredCredential.label,
            username: filteredCredential.username,
            email: filteredCredential.email,
            password: filteredCredential.password,
            otp: OTPService.updateOTP(filteredCredential.otp)
        });
    }

    res.send({
        status,
        errorMessage,
        decryptedPartialCredentialData
    })
}

export default handler
