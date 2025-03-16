import type { SpecificVaultInformationFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/SpecificVaultInformationFromServerInterface";
import type { BackendPassmanClient } from "~lib/BackendPassmanClient";
import type { VaultCreateServerResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultCreateServerResponseInterface";
import type { VaultDeleteResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultDeleteResponseInterface";
import type { EncryptedOwnedCredentialFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedOwnedCredentialFromServerInterface";
import type { PassmanClient } from "@binsky/passman-client-ts/lib/PassmanClient";

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
            console.error('no json or passmanClient', json, passmanClient);
            return;
        };
        console.log('starting updateBackgroundPassmanClient');
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
                    const vault = passmanClient.fullFeaturedVaultObjectCache.find(vault => vault.guid === vaultGuid);
                    if (vault) {
                        vault.clearRequestCache();
                    }
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
                    // vault was deleted successfully
                    await passmanClient.preloadVaults(false, false);
                    // todo: remove vault from passmanClient vault object cache
                }
            }
            // Handle credential operations
            else if (this.endsWithActionAndAnyGuid('credentials', requestUrl)) {
                console.log('found credential response operation');

                const typedResponse = json as EncryptedOwnedCredentialFromServerInterface;
                const credentialGuid = this.extractGuidFromUrl(requestUrl);

                console.log('found credential response operation for credential guid: ' + credentialGuid, typedResponse);

                
                if (credentialGuid && typedResponse.vault_id) {
                    if (passmanClient.preloadedVaults.length === 0) {
                        // Refresh the vault list
                        await passmanClient.preloadVaults(false, true);
                    }
                    const preloadedVault = passmanClient.preloadedVaults.find(vault => vault.id === typedResponse.vault_id);
                    if (preloadedVault && requestMethod !== 'GET') {
                        // Refresh the vault containing this credential
                        const cachedObjectVault = passmanClient.fullFeaturedVaultObjectCache.find(vault => vault.guid === preloadedVault.guid);
                        let vaultKey = undefined;
                        if (cachedObjectVault) {
                            vaultKey = cachedObjectVault.vaultKey;
                            await cachedObjectVault.clearRequestCache();
                        }
                        const vault = await passmanClient.getFullVaultByGuid(preloadedVault.guid, false, vaultKey);
                        // todo: fix the following block. I don't know why, but it causes a strange decryption error in an updated credential. Maybe it's a side-effect and another issue.
                        /*if (vault) {
                            for (const credential of vault.credentials) {
                                if (credential.guid === credentialGuid) {
                                    console.log(credential);
                                    credential.clearDecryptedDataCache();   // should not be necessary, but just to be sure
                                    await credential.refresh();
                                    break;
                                }
                            }
                        }*/
                        
                        const cachePrefix = 'cache-getJson-';
                        const requestCacheHandler = passmanClient.server.persistence.getRequestCacheHandler();
                        if (requestCacheHandler) {
                            try {
                                await requestCacheHandler.set(cachePrefix + '/credentials/' + credentialGuid, undefined);
                                await requestCacheHandler.set(cachePrefix + '/vaults/' + preloadedVault.guid, undefined);
                                console.log('cleared backend request cache for credential guid: ' + credentialGuid, 'and vault guid: ' + preloadedVault.guid);
                            } catch (e) {
                                console.warn('Failed to cache ' + requestUrl, e);
                            }
                        }
                    } else {
                        console.log('no preloaded vault found for credential guid: ' + credentialGuid);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating background PassmanClient:', error);
        }
    }

    /**
     * Update the frontend (popup) PassmanClient instance based on the server response.
     * Called from within the NextcloudServerMessagingConnector (in the frontend).
     */
    public static updatePopupPassmanClient = async (
        requestMethod: string,
        requestUrl: string,
        json: any,
        passmanClient: PassmanClient
    ) => {
        if (!json || !passmanClient) {
            console.error('no json or passmanClient', json, passmanClient);
            return;
        };
        console.log('starting updatePopupPassmanClient');
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
                    // vault was deleted successfully
                    await passmanClient.preloadVaults(false, false);
                    // todo: remove vault from passmanClient vault object cache
                }
            }
            // Handle credential operations
            else if (this.endsWithActionAndAnyGuid('credentials', requestUrl)) {
                console.log('found credential response operation');

                const typedResponse = json as EncryptedOwnedCredentialFromServerInterface;
                const credentialGuid = this.extractGuidFromUrl(requestUrl);

                console.log('found credential response operation for credential guid: ' + credentialGuid, typedResponse);

                
                if (credentialGuid && typedResponse.vault_id) {
                    if (passmanClient.preloadedVaults.length === 0) {
                        // Refresh the vault list
                        await passmanClient.preloadVaults(false, true);
                    }
                    const preloadedVault = passmanClient.preloadedVaults.find(vault => vault.id === typedResponse.vault_id);
                    if (preloadedVault) {
                        // Refresh the vault containing this credential
                        const vault = await passmanClient.getFullVaultByGuid(preloadedVault.guid, true);
                        if (vault) {
                            for (const credential of vault.credentials) {
                                if (credential.guid === credentialGuid) {
                                    await credential.refresh();
                                    return;
                                }
                            }
                        }

                        if (requestMethod !== 'GET') {
                            const cachePrefix = 'cache-getJson-';
                            const requestCacheHandler = passmanClient.server.persistence.getRequestCacheHandler();
                            if (requestCacheHandler) {
                                try {
                                    await requestCacheHandler.set(cachePrefix + '/credentials/' + credentialGuid, undefined);
                                    await requestCacheHandler.set(cachePrefix + '/vaults/' + preloadedVault.guid, undefined);
                                    console.log('cleared frontend request cache for credential guid: ' + credentialGuid, 'and vault guid: ' + preloadedVault.guid);
                                } catch (e) {
                                    console.warn('Failed to cache ' + requestUrl, e);
                                }
                            }
                        }
                    } else {
                        console.log('no preloaded vault found for credential guid: ' + credentialGuid);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating background PassmanClient:', error);
        }
    }
}
