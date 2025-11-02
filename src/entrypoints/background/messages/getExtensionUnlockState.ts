import { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
import ExtensionUnlockService from "~/services/ExtensionUnlockService";
import { onMessage } from "@/entrypoints/background/messaging";

export interface GetExtensionUnlockStateResponse {
    status: ExtensionUnlockState;
}

onMessage('getExtensionUnlockState', async () => {
    const status = await ExtensionUnlockService.isSetupDone().then((isSetUp: boolean) => {
        if (isSetUp) {
            return ExtensionUnlockService.isUnlocked().then((isUnlocked: boolean) => {
                if (isUnlocked) {
                    // correct unlock password already in session
                    return ExtensionUnlockState.UNLOCKED;
                } else {
                    // extension unlock required
                    return ExtensionUnlockState.LOCKED;
                }
            });
        } else {
            return ExtensionUnlockState.NOT_SET_UP_YET;
        }
    });

    return {
        status
    };
});
