import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { SpecificVaultInformationFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/SpecificVaultInformationFromServerInterface";
import type { VaultsGetResponseFromServer } from "@binsky/passman-client-ts/lib/Interfaces/Vault/GenericVaultInformationFromServerInterface";
import type { VaultCreateServerResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultCreateServerResponseInterface";
import type { VaultDeleteResponseInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/VaultDeleteResponseInterface";
import type { EncryptedOwnedCredentialFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/EncryptedOwnedCredentialFromServerInterface";
import ExtensionSettingsService from "~services/ExtensionSettingsService";

export interface NextcloudServerMessagingConnectorApiRequest {
    url: string,
    init?: RequestInit,
    forceDisableOfflineCache?: boolean
    //useCacheEntriesNotOlderThanMinutes?: number
}

const endsWithActionAndAnyGuid = (action: string, requestUrl: string) => {
    // this regex tests like: '/vaults/' + guid
    return new RegExp(`\/${action}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`).test(requestUrl);
}

const handler: PlasmoMessaging.MessageHandler<NextcloudServerMessagingConnectorApiRequest> = async (req, res) => {
    let error: Error | null = null;
    const response = await fetch(req.body.url, req.body.init)
        .catch((err: Error) => {
            error = err
        });

    let json = null;
    try {
        json = response ? await response.json() : null;
    } catch (_) {
    }

    // we need to classify the request based on the request url and the http request method so that we can handle the response correctly
    const requestMethod = req.body.init.method;
    const requestUrl = req.body.url;

    const passmanClient = await ExtensionSettingsService.getPassmanClient();

    if (requestMethod === 'GET' && requestUrl.endsWith('/vaults')) {
        // we should get a vaults list in response
        // ...
        let typedResponse = json as unknown as VaultsGetResponseFromServer;
    } else if (requestMethod === 'GET' && endsWithActionAndAnyGuid('vaults', requestUrl)) {    
        // we should get a specific vault in response
        // ...
        let typedResponse = json as unknown as SpecificVaultInformationFromServerInterface;
    } else if (requestMethod === 'POST' && requestUrl.endsWith('/vaults')) {
        // we should get the response of a vault creation
        // ...
        let typedResponse = json as unknown as VaultCreateServerResponseInterface;
    } else if (requestMethod === 'PATCH' && endsWithActionAndAnyGuid('vaults', requestUrl)) {
        // we should get the response of a specific vault update
        // ...
        let typedResponse = null;
    } else if (requestMethod === 'DELETE' && endsWithActionAndAnyGuid('vaults', requestUrl)) {
        // we should get the response of a vault deletion
        // ...
        let typedResponse = json as unknown as VaultDeleteResponseInterface;
    } else if (requestMethod === 'GET' && endsWithActionAndAnyGuid('credentials', requestUrl)) {
        // we should get a specific credential in response
        // ...
        let typedResponse = json as unknown as EncryptedOwnedCredentialFromServerInterface;
    } else if (requestMethod === 'POST' && requestUrl.endsWith('/credentials')) {
        // we should get the response of a credential creation
        // ...
        let typedResponse = json as unknown as EncryptedOwnedCredentialFromServerInterface;
    } else if (requestMethod === 'PATCH' && endsWithActionAndAnyGuid('credentials', requestUrl)) {
        // we should get the response of a credential update
        // ...
        let typedResponse = json as unknown as EncryptedOwnedCredentialFromServerInterface;
    } else if (requestMethod === 'DELETE' && endsWithActionAndAnyGuid('credentials', requestUrl)) {
        // we should get the response of a credential deletion
        // ...
        let typedResponse = json as unknown as EncryptedOwnedCredentialFromServerInterface;
    }

    if (error !== null) {
        // injecting a fallback error message if required
        error.message = error.message !== null && error.message !== '' ? error.message : 'Unknown error';

        // may we can populate cached data here
        // just 401 is not a valid reason to get cached data
        if (!response || response.status === undefined || response.status > 401) {
            // todo: check if cache is enabled and not yet timed out
            // CustomStorageService.getIndexedDBRequestCachingHandler()
        }
    }

    res.send({
        response: response ? {
            status: response.status,
            json,
            headers: response.headers
        } : null,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
        } : null
    })
}

export default handler
