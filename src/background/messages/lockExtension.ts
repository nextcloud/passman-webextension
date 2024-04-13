import type { PlasmoMessaging } from "@plasmohq/messaging"
import UnlockExtensionService from "~services/UnlockExtensionService";

/**
 * The extension frontend can be locked from the frontend itself, but it should additionally call this messaging endpoint,
 * to ensure the decrypted cache within the background service worker will be cleared without delay.
 * @param req
 * @param res
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    await UnlockExtensionService.lock();

    res.send({
        status: true
    });
}

export default handler
