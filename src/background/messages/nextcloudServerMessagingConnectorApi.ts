import type { PlasmoMessaging } from "@plasmohq/messaging"

export interface NextcloudServerMessagingConnectorApiRequest {
    url: string,
    init?: RequestInit
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

    res.send({
        response: response ? {
            status: response.status,
            json,
            headers: response.headers
        } : null,
        error
    })
}

export default handler
