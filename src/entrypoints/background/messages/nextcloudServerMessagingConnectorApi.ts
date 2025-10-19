import ExtensionSettingsService from "~/services/ExtensionSettingsService";
import { NextcloudServerMessagingConnectorService } from "~/services/NextcloudServerMessagingConnectorService";
import { onMessage } from '../messaging';

export interface NextcloudServerMessagingConnectorApiRequest {
    url: string,
    init?: RequestInit,
    forceDisableOfflineCache?: boolean
    //useCacheEntriesNotOlderThanMinutes?: number
}

export interface NextcloudServerMessagingConnectorApiResponse {
    response: {
        status: number,
        json: string,
        headers: Headers
    } | null,
    error: {
        name: string,
        message: string,
        stack?: string,
        cause: unknown,
    } | null | Error
}

onMessage('nextcloudServerMessagingConnectorApi', async (message) => {
    let error: Error | null = null;
    if (!message.data) {
        error = new Error('No request body provided to the messaging connector');
        return {
            response: null,
            error: error
        };
    }

    const response = await fetch(message.data.url, message.data.init)
        .catch((err: Error) => {
            console.error('Error fetching:', err);
            error = err;
        });

    let json = null;
    try {
        json = response ? await response.json() : null;
    } catch (_) {
    }

    // Get request method and URL for response classification
    const requestMethod = message.data.init?.method || 'GET';
    const requestUrl = message.data.url;

    // Get BackendPassmanClient instance
    const backendPassmanClient = await ExtensionSettingsService.getBackendPassmanClient();
    if (!backendPassmanClient) {
        // half-critical since the backendPassmanClient (e.g. cache) can not be updated, but we should not fail here. Response evaluation is not part if this specific condition.
        error = new Error('Could not get BackendPassmanClient instance');
    }

    // Update background PassmanClient based on response
    if (response && error === null && json && backendPassmanClient !== null) {
        console.log('updating background PassmanClient based on response', response, json, requestMethod, requestUrl, backendPassmanClient);
        await NextcloudServerMessagingConnectorService.updateBackgroundPassmanClient(requestMethod, requestUrl, json, backendPassmanClient);
    }

    if (error !== null) {
        // Injecting a fallback error message if required
        error.message = error.message !== null && error.message !== '' ? error.message : 'Unknown error';

        // may we can populate cached data here
        // just 401 is not a valid reason to get cached data
        if (!response || response.status === undefined || response.status > 401) {
            // todo: check if cache is enabled and not yet timed out
            // CustomStorageService.getIndexedDBRequestCachingHandler()
        }
    }

    return {
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
    };
});
