import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import type {
    DecryptedCredentialInterface
} from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
import type { DecryptedPartialCredentialData } from "./getPartiallyDecryptedFilteredCredentialsList";
import { ExtensionBadgeService } from "~/services/backend/ExtensionBadgeService";
import browser from "webextension-polyfill";
import { onMessage } from "@/entrypoints/background/messaging";

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
        errorMessage = 'No credential data provided';
        return {
            status,
            errorMessage
        };
    }
    if (!senderTab) {
        errorMessage = 'No source tab found';
        return {
            status,
            errorMessage
        };
    }

    await ExtensionSettingsService.getBackendPassmanClient().then(async (backendPassmanClient) => {
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
                                errorMessage = 'Label is required';
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
                                errorMessage = 'Failed to save credential';
                            }
                        } else {
                            errorMessage = 'Could not decrypt vault';
                        }
                    } else {
                        errorMessage = 'No default vault info found';
                    }
                } catch (exception) {
                    console.error(exception);
                    errorMessage = 'Could not get or decrypt vault';
                }
            });
        } else {
            errorMessage = 'Could not get backend passman client';
        }
    });

    return {
        status,
        errorMessage,
        decryptedPartialCredentialData
    };
});
