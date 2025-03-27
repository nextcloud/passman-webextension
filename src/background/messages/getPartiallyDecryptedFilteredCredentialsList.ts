import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
import type { IconInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/IconInterface";

export enum GetCredentialsListMessagingFilterType {
    DEFAULT_SEARCH_FULL_TEXT_LABEL,
    SEARCH_BY_URL
}

export type GetCredentialsListMessagingConfiguration = {
    filterText: string,
    filterType: GetCredentialsListMessagingFilterType,
    getCachedIfPossible: boolean
}

export type DecryptedPartialCredentialData = {
    guid: string,
    label: string | null,
    username: string | null,
    email: string | null,
    password: string | null,
    otp: string | null | void,   // current OTP, not the secret
    icon: IconInterface | null,
    is_shared_with_me: boolean | null,
    is_shared_with_others: boolean | null,
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

    if (req.body === undefined || !req.body.filterText || req.body.filterType === undefined || req.body.getCachedIfPossible === undefined) {
        errorMessage = 'Invalid request (check request body)';
    } else {
        const body = req.body;
        await ExtensionSettingsService.getBackendPassmanClient().then(async (backendPassmanClient) => {
            if (backendPassmanClient) {
                return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    if (!defaultVaultInfo) {
                        errorMessage = 'Could not get default vault info';
                        return;
                    }

                    try {
                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, body.getCachedIfPossible ?? true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                // should not be needed, but having no custom credential here could lead to an caching issue
                                console.log("refresh vault");
                                await myVault.refresh();
                            }
    
                            if (body.filterType === GetCredentialsListMessagingFilterType.SEARCH_BY_URL) {
                                filteredCredentials = await CustomCredentialFilterService.getCredentialsByUrl(body.filterText, myVault.credentials);
                            } else {
                                filteredCredentials = CustomCredentialFilterService.getCredentialsByLabel(body.filterText, myVault.credentials);
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
                guid: filteredCredential.guid,
                label: filteredCredential.label,
                username: filteredCredential.username,
                email: filteredCredential.email,
                password: filteredCredential.password,
                otp: OTPService.updateOTP(filteredCredential.otp),
                icon: filteredCredential.icon,
                is_shared_with_me: filteredCredential.shared_key ? true : null,
                is_shared_with_others: filteredCredential.acl ? true : null
            });
        }
    }

    res.send({
        status,
        errorMessage,
        decryptedPartialCredentialData
    })
}

export default handler
