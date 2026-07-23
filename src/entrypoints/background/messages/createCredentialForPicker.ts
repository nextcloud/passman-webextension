import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import type {
    DecryptedCredentialInterface
} from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
import type { DecryptedPartialCredentialData } from "./getPartiallyDecryptedFilteredCredentialsList";
import { ExtensionBadgeService } from "~/services/backend/ExtensionBadgeService";
import browser from "webextension-polyfill";
import { onMessage } from "@/entrypoints/background/messaging";
import { i18n } from "~/lib/i18n";

export interface CreateCredentialForPickerMessagingRequest {
    credentialData: Partial<DecryptedCredentialInterface>;
}

export interface CreateCredentialForPickerMessagingResponse {
    status: boolean;
    errorMessage?: string;
    decryptedPartialCredentialData?: DecryptedPartialCredentialData;
}

onMessage('createCredentialForPicker', async (message) => {
    let status = false;
    let errorMessage = undefined;
    let decryptedPartialCredentialData = undefined;
    const credentialData = message.data?.credentialData;

    // Get the tab from sender information
    let senderTab: browser.Tabs.Tab | undefined = undefined;
    try {
        if (message.sender?.tab?.id) {
            senderTab = await browser.tabs.get(message.sender.tab.id);
        }
    } catch (error) {
        console.warn('Could not get sender tab:', error);
    }

    if (!credentialData) {
        errorMessage = i18n.getMessage('no_credential_data_provided');
        return {
            status,
            errorMessage
        };
    }
    if (!senderTab) {
        errorMessage = i18n.getMessage('no_source_tab_found');
        return {
            status,
            errorMessage
        };
    }

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                try {
                    if (defaultVaultInfo) {
                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;

                            // Create new credential
                            const credential = new Credential(myVault, backendPassmanClient.server);
                            const initialCredentialData = credential.exportData();

                            // Validate required fields
                            if (!credentialData.label || credentialData.label.length === 0) {
                                errorMessage = i18n.getMessage('label_required');
                                return;
                            }

                            // Update credential with provided data
                            credential.updateData({
                                ...initialCredentialData,
                                ...credentialData
                            });

                            // Save credential
                            if (await credential.save()) {
                                myVault.credentials.push(credential);
                                status = true;
                                decryptedPartialCredentialData = {
                                    guid: credential.guid,
                                    label: credential.label,
                                    username: credential.username,
                                    email: credential.email,
                                    password: credential.password,
                                    icon: credential.icon,
                                };

                                // Refresh all tab badges to show updated credential counts
                                ExtensionBadgeService.createIconForTab(senderTab, false, myVault);
                                // credential.save() already upserted into the shared IndexedDB model store;
                                // popup opens via getFullVaultByGuid(..., true) / restore — no forced network refresh.
                                // keep it here as a reference for the future if required. maybe use it for a new feature.
                                // CustomStorageService.getUnsafeLocalStorage().set(CONTENT_SCRIPT_MODIFIED_CREDENTIALS_KEY, "true");
                            } else {
                                errorMessage = i18n.getMessage('failed_to_save_credential');
                            }
                        } else {
                            errorMessage = i18n.getMessage('could_not_decrypt_vault');
                        }
                    } else {
                        errorMessage = i18n.getMessage('no_default_vault_info_found');
                    }
                } catch (exception) {
                    console.error(exception);
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
