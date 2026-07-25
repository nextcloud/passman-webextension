import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import type { DecryptedPartialCredentialData } from "./getPartiallyDecryptedFilteredCredentialsList";
import { ExtensionBadgeService } from "~/services/backend/ExtensionBadgeService";
import browser from "webextension-polyfill";
import { onMessage } from "@/entrypoints/background/messaging";
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export interface UpdateCredentialForDoorhangerMessagingRequest {
    guid: string;
    username?: string;
    email?: string;
    password: string;
}

export interface UpdateCredentialForDoorhangerMessagingResponse {
    status: boolean;
    errorMessage?: string;
    decryptedPartialCredentialData?: DecryptedPartialCredentialData;
}

onMessage('updateCredentialForDoorhanger', async (message) => {
    let status = false;
    let errorMessage: string | undefined = undefined;
    let decryptedPartialCredentialData: DecryptedPartialCredentialData | undefined = undefined;
    const data = message.data;

    let senderTab: browser.Tabs.Tab | undefined = undefined;
    try {
        if (message.sender?.tab?.id) {
            senderTab = await browser.tabs.get(message.sender.tab.id);
        }
    } catch (error) {
        logger.warn('Could not get sender tab:', error);
    }

    if (!data?.guid || !data.password) {
        errorMessage = i18n.getMessage('no_credential_data_provided');
        return { status, errorMessage };
    }
    if (!senderTab) {
        errorMessage = i18n.getMessage('no_source_tab_found');
        return { status, errorMessage };
    }

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    if (defaultVaultInfo) {
                        const myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;

                            const credential = myVault.getCredentialByGuid(data.guid);
                            if (!credential) {
                                errorMessage = i18n.getMessage('credential_update_error');
                                return;
                            }

                            const currentData = credential.exportData();
                            credential.updateData({
                                ...currentData,
                                ...(data.username !== undefined ? { username: data.username } : {}),
                                ...(data.email !== undefined ? { email: data.email } : {}),
                                password: data.password
                            });

                            if (await credential.update()) {
                                status = true;
                                decryptedPartialCredentialData = {
                                    guid: credential.guid,
                                    label: credential.label,
                                    username: credential.username,
                                    email: credential.email,
                                    password: credential.password,
                                    otp: undefined,
                                    icon: credential.icon,
                                    is_shared_with_me: null,
                                    is_shared_with_others: null
                                };

                                ExtensionBadgeService.createIconForTab(senderTab, false, myVault);
                            } else {
                                errorMessage = i18n.getMessage('credential_update_error');
                            }
                        } else {
                            errorMessage = i18n.getMessage('could_not_decrypt_vault');
                        }
                    } else {
                        errorMessage = i18n.getMessage('no_default_vault_info_found');
                    }
                } catch (exception) {
                    logger.error(exception);
                    errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                }
            });
        } else {
            errorMessage = i18n.getMessage('could_not_get_backend_passman_client');
        }
    });

    return {
        status,
        errorMessage,
        decryptedPartialCredentialData
    };
});
