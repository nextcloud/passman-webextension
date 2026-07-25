import PassmanClientService from "~/services/PassmanClientService";
import { NextcloudServerMessagingConnectorService } from "~/services/NextcloudServerMessagingConnectorService";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export interface NextcloudServerMessagingConnectorApiRequest {
    url: string,
    init?: RequestInit,
    forceDisableOfflineCache?: boolean
    //useCacheEntriesNotOlderThanMinutes?: number
}

export interface NextcloudServerMessagingConnectorApiResponse {
    response: {
        status: number,
        json: object | null,
        headers: {[p: string]: string} // serializable Headers entries
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
            logger.error('Error fetching:', err);
            error = err;
        });

    let json: object | null = null;
    try {
        json = response ? await response.json() : null;
    } catch (responseToJsonError) {
        logger.warn('Failed getting response json, may intended, but shouldn\'t completely pass in silence', responseToJsonError);
    }

    // Get request method and URL for response classification
    const requestMethod = message.data.init?.method || 'GET';
    const requestUrl = message.data.url;

    // Get BackendPassmanClient instance
    const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
    if (!backendPassmanClient) {
        // half-critical since the backendPassmanClient (e.g. cache) can not be updated, but we should not fail here. Response evaluation is not part if this specific condition.
        error = new Error('Could not get BackendPassmanClient instance');
    }

    // Update background PassmanClient based on response
    if (response && error === null && json && backendPassmanClient !== null) {
        logger.debug('updating background PassmanClient based on response', response, json, requestMethod, requestUrl, backendPassmanClient);
        try {
            await NextcloudServerMessagingConnectorService.updateBackgroundPassmanClient(requestMethod, requestUrl, json, backendPassmanClient);
        } catch (e) {
            logger.error('failure while running updateBackgroundPassmanClient', e);
            // escalate, since it should not quietly pass when internal state does not update correctly
            throw e;
        }
    }

    if (error !== null) {
        // Injecting a fallback error message if required
        error.message = error.message !== null && error.message !== '' ? error.message : i18n.getMessage('unknown_error');

        // Offline fallback:
        // Theoretically we could populate/return cached data here, but callers should use PassmanClient.getFullVaultByGuid(guid, true) instead,
        // which reads the shared IndexedDB model store before hitting the network. Not toooo much magic here.
        // just 401 is not a valid reason to get cached data
        if (!response || response.status === undefined || response.status > 401) {
            // If we'd really wanna do that, we could optionally surface model-store data here when forceDisableOfflineCache is false
        }
    }

    return {
        response: response ? {
            status: response.status,
            json,
            headers: Object.fromEntries(response.headers.entries())
        } : null,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
        } : null
    };
});
