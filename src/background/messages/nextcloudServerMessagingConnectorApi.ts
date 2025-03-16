import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService from "~services/ExtensionSettingsService";
import { NextcloudServerMessagingConnectorService } from "~services/NextcloudServerMessagingConnectorService";

export interface NextcloudServerMessagingConnectorApiRequest {
    url: string,
    init?: RequestInit,
    forceDisableOfflineCache?: boolean
    //useCacheEntriesNotOlderThanMinutes?: number
}

const handler: PlasmoMessaging.MessageHandler<NextcloudServerMessagingConnectorApiRequest> = async (req, res) => {
    let error: Error | null = null;
    const response = await fetch(req.body.url, req.body.init)
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
    const requestMethod = req.body.init.method || 'GET';
    const requestUrl = req.body.url;

    // Get BackendPassmanClient instance
    const backendPassmanClient = await ExtensionSettingsService.getBackendPassmanClient();

    // Update background PassmanClient based on response
    if (response && error === null && json) {
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
