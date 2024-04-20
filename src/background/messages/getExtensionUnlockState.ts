import type { PlasmoMessaging } from "@plasmohq/messaging"
import { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
import ExtensionUnlockService from "~services/ExtensionUnlockService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
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

    res.send({
        status
    });
}

export default handler
