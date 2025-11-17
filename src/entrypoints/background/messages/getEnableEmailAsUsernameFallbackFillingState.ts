import ExtensionSettingsService, {
    ExtensionSettings,
    ExtensionSettingsOptions
} from "~/services/ExtensionSettingsService";
import { onMessage } from "@/entrypoints/background/messaging";

export interface GetEnableEmailAsUsernameFallbackFillingStateResponse {
    enableEmailAsUsernameFallbackFilling: ExtensionSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling] | null;
}

onMessage('getEnableEmailAsUsernameFallbackFillingState', async () => {
    return {
        enableEmailAsUsernameFallbackFilling: await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling, true)
    };
});
