import ExtensionUnlockService from "~/services/ExtensionUnlockService";
import { onMessage } from '../messaging';
import { logger } from "~/services/ConsoleLoggingService";

export interface ChangeExtensionPasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface ChangeExtensionPasswordResponse {
    status: boolean;
}

/**
 * Change the extension unlock password in the background service worker.
 * The service worker's SecureStorage cache is closed after the storage key is re-wrapped.
 */
onMessage('changeExtensionPassword', async (message) => {
    let status = false;
    try {
        status = await ExtensionUnlockService.changeExtensionPassword(
            message.data.oldPassword,
            message.data.newPassword
        );
    } catch (error) {
        logger.error('Error in changeExtensionPassword handler:', error);
    }

    return {
        status
    };
});
