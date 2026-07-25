import type { SpecificVaultInformationFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/SpecificVaultInformationFromServerInterface";
import type { BackendPassmanClient } from "~/lib/BackendPassmanClient";
import type { VaultCreateServerResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultCreateServerResponseInterface";
import type { VaultDeleteResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultDeleteResponseInterface";
import type { EncryptedOwnedCredentialFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedOwnedCredentialFromServerInterface";
import type { PassmanClient } from "@binsky/passman-client-ts/lib/PassmanClient";
import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import { logger } from "~/services/ConsoleLoggingService";

/**
 * Contains some helper functions for the NextcloudServerMessagingConnector.
 */
export class NextcloudServerMessagingConnectorService {
    public static endsWithActionAndAnyGuid = (action: string, requestUrl: string) => {
        // this regex tests like: '/vaults/' + guid
        return new RegExp(`\/${action}\/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$`).test(requestUrl);
    }

    /**
     * Extract GUID from a URL that ends with a GUID
     */
    public static extractGuidFromUrl = (url: string): string | null => {
        const guidMatch = url.match(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
        return guidMatch ? guidMatch[0] : null;
    }

    /**
     * Prefer an already-loaded vault from memory/model store (no network).
     */
    private static getCachedVaultIfPossible = async (passmanClient: PassmanClient, guid: string): Promise<Vault | void> => {
        return passmanClient.getFullVaultByGuid(guid, true);
    }

    /**
     * Apply a credential POST/PATCH/DELETE response to an in-memory vault + IndexedDB model store.
     * Does not refetch the vault from the server — Credential.save/update/destroy on the caller
     * already own the mutation; this only keeps the other client's cache consistent.
     */
    private static applyCredentialMutationLocally = async (
        passmanClient: PassmanClient,
        requestMethod: string,
        typedResponse: EncryptedOwnedCredentialFromServerInterface,
        credentialGuidFromUrl: string | null
    ): Promise<void> => {
        if (passmanClient.preloadedVaults.length === 0) {
            // Resolve vault_id → guid from model store / memory only (no network)
            await passmanClient.activeConnection.restore();
        }
        const preloadedVault = passmanClient.preloadedVaults.find(vault => vault.id === typedResponse.vault_id);
        if (!preloadedVault) {
            logger.log('no preloaded vault found for credential mutation', credentialGuidFromUrl, typedResponse.vault_id);
            return;
        }

        const vault = await this.getCachedVaultIfPossible(passmanClient, preloadedVault.guid);
        if (!vault) {
            logger.log('no cached vault available for incremental credential sync', preloadedVault.guid);
            return;
        }

        const modelStore = passmanClient.server.persistence.getModelStore();
        const connectionId = passmanClient.server.getConnectionId();
        const credentialGuid = credentialGuidFromUrl ?? typedResponse.guid;

        if (requestMethod === 'DELETE') {
            const pos = vault.credentials.findIndex(c => c.guid === credentialGuid);
            if (pos >= 0) {
                vault.credentials.splice(pos, 1);
            }
            await modelStore?.deleteCredential(connectionId, vault.guid, credentialGuid);
            return;
        }

        // POST (create) or PATCH (update): upsert credential in memory + model store
        const updatedCredential = Credential.fromData(typedResponse, vault, passmanClient.server);
        const existingIndex = vault.credentials.findIndex(c => c.guid === updatedCredential.guid);
        if (existingIndex >= 0) {
            vault.credentials[existingIndex] = updatedCredential;
        } else {
            vault.credentials.push(updatedCredential);
        }
        await modelStore?.putCredential(connectionId, vault.guid, updatedCredential.getAsSerializable());
    }

    /**
     * Update the background PassmanClient instance based on the server response.
     * Called from within the NextcloudServerMessagingConnectorApi (handler; in the background).
     */
    public static updateBackgroundPassmanClient = async (
        requestMethod: string,
        requestUrl: string,
        json: any,
        passmanClient: BackendPassmanClient
    ) => {
        if (!json || !passmanClient) {
            logger.error('no json or passmanClient', !!json, !!passmanClient);
            logger.debug('no json or passmanClient', json, passmanClient);
            return;
        };
        logger.log('starting updateBackgroundPassmanClient');
        try {
            // Handle vault list updates
            if (requestMethod === 'GET' && requestUrl.endsWith('/vaults')) {
                // const typedResponse = json as VaultsGetResponseFromServer;
            }
            // Handle specific vault refresh operation; vault object cache / model store are updated by Vault.refresh callers;
            // Do not clear the model store here.
            // This was used by the former offline cache feature; it is no longer used.
            // Todo: cleanup in future, if the new approach proven to be working well.
            else if (requestMethod === 'GET' && this.endsWithActionAndAnyGuid('vaults', requestUrl)) {
                // const typedResponse = json as SpecificVaultInformationFromServerInterface;
            }
            // Handle vault creation
            else if (requestMethod === 'POST' && requestUrl.endsWith('/vaults')) {
                const typedResponse = json as VaultCreateServerResponseInterface;
                await passmanClient.preloadVaults(false, false); // Refresh preloaded vault list after creation
            }
            // Handle vault deletion
            else if (requestMethod === 'DELETE' && this.endsWithActionAndAnyGuid('vaults', requestUrl)) {
                const vaultGuid = this.extractGuidFromUrl(requestUrl);
                const typedResponse = json as VaultDeleteResponseInterface;
                if (typedResponse.ok) {
                    if (vaultGuid) {
                        const vault = await this.getCachedVaultIfPossible(passmanClient, vaultGuid);
                        if (vault) {
                            // clear from model store if it still exists
                            await vault.clearFromModelStore();
                            // todo: add logic to remove the vault from the central decrypted (vault) object cache
                        }
                    }
                    await passmanClient.preloadVaults(false, false);
                }
            }
            // Handle credential operations incremental only, never refetch /vaults/{guid}
            else if (requestUrl.endsWith('/credentials') || this.endsWithActionAndAnyGuid('credentials', requestUrl)) {
                const typedResponse = json as EncryptedOwnedCredentialFromServerInterface;

                // it's a get, patch or delete operation if there's a guid in the url
                const credentialGuidFromUrl = this.extractGuidFromUrl(requestUrl);
                logger.log('found credential response operation with credential guid from url:', credentialGuidFromUrl, typedResponse);

                if (requestMethod === 'GET') {
                    // Credential GETs only prepare write ops; Credential.refresh on the caller owns applying them
                    return;
                }

                if (typedResponse.vault_id) {
                    await this.applyCredentialMutationLocally(
                        passmanClient,
                        requestMethod,
                        typedResponse,
                        credentialGuidFromUrl
                    );
                }
            }
        } catch (error) {
            logger.error('Error updating background PassmanClient:', error);
        }
    }

    /**
     * Update the frontend (popup) PassmanClient instance based on the server response.
     * Called from within the NextcloudServerMessagingConnector (in the frontend).
     *
     * Credential mutations are applied by Credential.save/update/destroy after postJson/deleteJson
     * returns (including persistToModelStore). Do not refetch the vault here.
     */
    public static updatePopupPassmanClient = async (
        requestMethod: string,
        requestUrl: string,
        json: any,
        passmanClient: PassmanClient
    ) => {
        if (!json || !passmanClient) {
            logger.error('no json or passmanClient', !!json, !!passmanClient);
            logger.debug('no json or passmanClient', json, passmanClient);
            return;
        };
        logger.log('starting updatePopupPassmanClient');
        try {
            // Handle vault list updates
            if (requestMethod === 'GET' && requestUrl.endsWith('/vaults')) {
                // const typedResponse = json as VaultsGetResponseFromServer;
            }
            // Handle specific vault refresh
            else if (requestMethod === 'GET' && this.endsWithActionAndAnyGuid('vaults', requestUrl)) {
                const typedResponse = json as SpecificVaultInformationFromServerInterface;
                const vaultGuid = this.extractGuidFromUrl(requestUrl);
                if (vaultGuid) {
                    // todo: add vault to passmanClient or update existing vault
                }
            }
            // Handle vault creation
            else if (requestMethod === 'POST' && requestUrl.endsWith('/vaults')) {
                const typedResponse = json as VaultCreateServerResponseInterface;
                await passmanClient.preloadVaults(false, false); // Refresh preloaded vault list after creation
            }
            // Handle vault deletion
            else if (requestMethod === 'DELETE' && this.endsWithActionAndAnyGuid('vaults', requestUrl)) {
                const vaultGuid = this.extractGuidFromUrl(requestUrl);
                const typedResponse = json as VaultDeleteResponseInterface;
                if (typedResponse.ok) {
                    if (vaultGuid) {
                        const vault = await this.getCachedVaultIfPossible(passmanClient, vaultGuid);
                        if (vault) {
                            await vault.clearFromModelStore();
                        }
                    }
                    await passmanClient.preloadVaults(false, false);
                }
            }
            // Credential ops: no-op — Credential.save/update/destroy already update memory + model store
            else if (requestUrl.endsWith('/credentials') || this.endsWithActionAndAnyGuid('credentials', requestUrl)) {
                return;
            }
        } catch (error) {
            logger.error('Error updating popup PassmanClient:', error);
        }
    }
}
