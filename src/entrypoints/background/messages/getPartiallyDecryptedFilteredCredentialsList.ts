import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import PassmanClientService from "~/services/PassmanClientService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { CustomCredentialFilterService } from "~/services/CustomCredentialFilterService";
import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
import type { IconInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/IconInterface";
import { onMessage } from "@/entrypoints/background/messaging";
import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";
import { SharingACL } from "@binsky/passman-client-ts/lib/Model/SharingACL";
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";
import EncryptionErrorSkippedCredentialStore, {
    type SkippedEncryptionErrorCredential
} from "~/services/EncryptionErrorSkippedCredentialStore";

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
    can_write: boolean | null,
}

/** Non-secret identity of a credential with malformed (non-string) decrypted field values. */
export type MalformedFieldDataCredential = {
    guid: string,
    label: string,
    malformedFields: string[]
}

export type GetCredentialsListMessagingResponse = {
    status: boolean,
    errorMessage: string | null,
    decryptedPartialCredentialData: DecryptedPartialCredentialData[],
    invalidUrlProvided: boolean | null,
    /** Credentials remembered because a filter skipped them after an encryption error. Empty when this request did not read the store. */
    encryptionErrorSkippedCredentials: SkippedEncryptionErrorCredential[],
    /**
     * Not deleted, visible credentials of the vault, where malformed field data has been detected so far.
     * Only covers fields that have been decrypted (read), like the listed fields of this response.
     */
    malformedFieldDataCredentials: MalformedFieldDataCredential[]
}

/**
 * Collects credentials with detected malformed field data, that vault recovery would scan (not hidden, not deleted).
 */
export function collectMalformedFieldDataCredentials(credentials: Credential[]): MalformedFieldDataCredential[] {
    return credentials
        .filter((credential) => !credential.hidden && !CredentialFilterService.isDeleted(credential) && credential.hasMalformedFieldData())
        .map((credential) => ({
            guid: credential.guid,
            label: typeof credential.label === 'string' ? credential.label : '',
            malformedFields: [...credential.getMalformedFields()]
        }));
}

export function toDecryptedPartialCredentialData(credential: Credential, forPicker: boolean = false): DecryptedPartialCredentialData {
    if (forPicker) {
        return {
            guid: credential.guid,
            label: credential.label,
            username: credential.username,
            email: credential.email,
            password: credential.password,
            otp: null,
            icon: credential.icon,
            is_shared_with_me: null,
            is_shared_with_others: null,
            can_write: null,
        };
    }
    return {
        guid: credential.guid,
        label: credential.label,
        username: credential.username,
        email: credential.email,
        password: credential.password,
        otp: OTPService.updateOTP(credential.otp),
        icon: credential.icon,
        is_shared_with_me: credential.hasValidSharedKey() ? true : null,
        is_shared_with_others: credential.acl ? true : null,
        can_write: credential.acl === undefined
            ? true
            : credential.acl.permissions.hasPermission(SharingACL.permissions.WRITE),
    };
}

onMessage('getPartiallyDecryptedFilteredCredentialsList', async (message) => {
    let status = false;
    let errorMessage = null;
    let filteredCredentials: Credential[] = [];
    let decryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];
    let invalidUrlProvided: boolean | null = null;
    let encryptionErrorSkippedCredentials: SkippedEncryptionErrorCredential[] = [];
    let malformedFieldDataCredentials: MalformedFieldDataCredential[] = [];
    let vaultCredentials: Credential[] = [];
    const skippedEncryptionErrors: Credential[] = [];

    const body = message.data;
    const filterTextIsString = typeof body?.filterText === 'string';
    const invalidBody = body === undefined
        || !filterTextIsString
        || body.filterType === undefined
        || body.getCachedIfPossible === undefined;

    if (invalidBody) {
        errorMessage = i18n.getMessage('invalid_request_check_body');
    } else {
        await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
            if (backendPassmanClient) {
                return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    if (!defaultVaultInfo) {
                        errorMessage = i18n.getMessage('could_not_get_default_vault_info');
                        return;
                    }

                    try {
                        const getCachedIfPossible = body.getCachedIfPossible ?? true;

                        if (getCachedIfPossible === false && defaultVaultInfo.guid) {
                            try {
                                // clear all stored encryption errors since we'll do a full refresh now
                                await EncryptionErrorSkippedCredentialStore.clear(defaultVaultInfo.guid);
                            } catch (exception) {
                                logger.error('[getPartiallyDecryptedFilteredCredentialsList] failed to clear skipped encryption errors', exception);
                            }
                        }

                        let myVault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, getCachedIfPossible);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                // should not be needed, but having no custom credential here could lead to an caching issue
                                logger.log("refresh vault");
                                await myVault.refresh();
                            }

                            const onEncryptionErrorSkippedCredential = (credential: Credential) => {
                                skippedEncryptionErrors.push(credential);
                            };

                            if (body.filterType === GetCredentialsListMessagingFilterType.SEARCH_BY_URL) {
                                const filterResult = await CustomCredentialFilterService.getCredentialsByUrl(
                                    body.filterText,
                                    myVault.credentials,
                                    onEncryptionErrorSkippedCredential
                                );
                                if (filterResult === null) {
                                    // an empty result for an invalid URL is not an error, but we need to know about it, like in the IndexPage UI
                                    invalidUrlProvided = true;
                                } else {
                                    filteredCredentials = filterResult;
                                }
                            } else {
                                filteredCredentials = CredentialFilterService.getFilteredCredentials(
                                    myVault.credentials,
                                    FILTERS.SHOW_ALL,
                                    body.filterText,
                                    undefined,
                                    undefined,
                                    onEncryptionErrorSkippedCredential
                                );
                            }

                            vaultCredentials = myVault.credentials;
                            status = true;
                        } else {
                            errorMessage = i18n.getMessage('could_not_decrypt_vault');
                        }
                    } catch (exception) {
                        logger.error('[getPartiallyDecryptedFilteredCredentialsList] background message handler failed to get, decrypt or filter the vault credentials', exception);
                        errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                    } finally {
                        if (defaultVaultInfo.guid) {
                            try {
                                encryptionErrorSkippedCredentials = await EncryptionErrorSkippedCredentialStore.merge(defaultVaultInfo.guid, skippedEncryptionErrors);
                            } catch (exception) {
                                logger.error('[getPartiallyDecryptedFilteredCredentialsList] failed to store skipped encryption errors', exception);
                            }
                        }
                    }
                });
            }
        });
        for (const filteredCredential of filteredCredentials) {
            decryptedPartialCredentialData.push(toDecryptedPartialCredentialData(filteredCredential));

            // may won't cover all credentials with malformed field data, but it's a better solution than adding another loop (see comment below)
            if (filteredCredential.hasMalformedFieldData()) {
                malformedFieldDataCredentials.push({
                    guid: filteredCredential.guid,
                    label: typeof filteredCredential.label === 'string' ? filteredCredential.label : '',
                    malformedFields: [...filteredCredential.getMalformedFields()]
                });
            }
        }
        // after building the response data, since that decrypts (and thereby checks) the listed fields
        // this would be the best and most reliable solution, but would add up to the response time every time the extension is opened
        // malformedFieldDataCredentials = collectMalformedFieldDataCredentials(vaultCredentials);
    }

    return {
        status,
        errorMessage,
        decryptedPartialCredentialData,
        invalidUrlProvided,
        encryptionErrorSkippedCredentials,
        malformedFieldDataCredentials
    };
});
