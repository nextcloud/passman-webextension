import { onMessage } from "@/entrypoints/background/messaging";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import {
    normalizeDoorhangerSettings,
    type DoorhangerSettings
} from "~/lib/doorhanger/doorhangerSettings";

export type GetDoorhangerSettingsResponse = DoorhangerSettings;

/**
 * Returns Doorhanger layout/gravity from extension settings.
 */
onMessage('getDoorhangerSettings', async () => {
    const layout = await ExtensionSettingsService.getPartialExtensionSettings(
        ExtensionSettingsOptions.doorhangerLayout,
        true
    );
    const gravity = await ExtensionSettingsService.getPartialExtensionSettings(
        ExtensionSettingsOptions.doorhangerGravity,
        true
    );

    return normalizeDoorhangerSettings(layout, gravity);
});
