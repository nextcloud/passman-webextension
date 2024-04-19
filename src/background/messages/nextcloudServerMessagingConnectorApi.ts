import type { PlasmoMessaging } from "@plasmohq/messaging"

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
            error = err
        });

    let json = null;
    try {
        json = response ? await response.json() : null;
    } catch (_) {
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
