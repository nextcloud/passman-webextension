import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { CustomCredentialFilterService } from "~/services/CustomCredentialFilterService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
import type { IconInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/IconInterface";
import { onMessage } from "@/entrypoints/background/messaging";
import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

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

onMessage('getPartiallyDecryptedFilteredCredentialsList', async (message) => {
    let status = false;
    let errorMessage = null;
    let filteredCredentials: Credential[] = [];
    let decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

    if (message.data === undefined || !message.data.filterText || message.data.filterType === undefined || message.data.getCachedIfPossible === undefined) {
        errorMessage = i18n.getMessage('invalid_request_check_body');
    } else {
        const body = message.data;
        await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
            if (backendPassmanClient) {
                return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    if (!defaultVaultInfo) {
                        errorMessage = i18n.getMessage('could_not_get_default_vault_info');
                        return;
                    }

                    try {
                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, body.getCachedIfPossible ?? true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                // should not be needed, but having no custom credential here could lead to an caching issue
                                logger.log("refresh vault");
                                await myVault.refresh();
                            }

                            let customFilteredCredentials = [];
                            if (body.filterType === GetCredentialsListMessagingFilterType.SEARCH_BY_URL) {
                                customFilteredCredentials = await CustomCredentialFilterService.getCredentialsByUrl(body.filterText, myVault.credentials) ?? [];
                            } else {
                                customFilteredCredentials = CustomCredentialFilterService.getCredentialsByLabel(body.filterText, myVault.credentials);
                            }

                            // apply the default filters after our custom filters
                            filteredCredentials = CredentialFilterService.getFilteredCredentials(customFilteredCredentials ?? [], FILTERS.SHOW_ALL);
                            status = true;
                        } else {
                            errorMessage = i18n.getMessage('could_not_decrypt_vault');
                        }
                    } catch (exception) {
                        errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
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

    return {
        status,
        errorMessage,
        decryptedPartialCredentialData
    };
});
