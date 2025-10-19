import ExtensionSettingsService, {
    ExtensionSettings,
    ExtensionSettingsOptions
} from "~/services/ExtensionSettingsService";
import { onMessage } from "@/entrypoints/background/messaging";

export interface GetAutofillEnabledStateResponse {
    autofillEnabled: ExtensionSettings[ExtensionSettingsOptions.autofillEnabled] | null;
}

onMessage('getAutofillEnabledState', async () => {
    return {
        autofillEnabled: await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.autofillEnabled)
    };
});
