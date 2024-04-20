import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionUnlockService from "~services/ExtensionUnlockService";

/**
 * The extension frontend can be locked from the frontend itself, but it should additionally call this messaging endpoint,
 * to ensure the decrypted cache within the background service worker will be cleared without delay.
 * @param req
 * @param res
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    res.send({
        status: await ExtensionUnlockService.unlock(req.body.extensionUnlockPassword)
    });
}

export default handler
