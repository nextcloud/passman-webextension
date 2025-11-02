import ExtensionUnlockService from "~/services/ExtensionUnlockService";
import { onMessage } from "@/entrypoints/background/messaging";

export interface LockExtensionResponse {
    status: boolean;
}

/**
 * The extension frontend can be locked from the frontend itself, but it should additionally call this messaging endpoint,
 * to ensure the decrypted cache within the background service worker will be cleared without delay.
 * @param req
 * @param res
 */
onMessage('lockExtension', async (message) => {
    await ExtensionUnlockService.lock();

    return {
        status: true
    };
});
