import type { PlasmoMessaging } from "@plasmohq/messaging"
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    res.send({
        autofillEnabled: await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.autofillEnabled)
    });
}

export default handler
