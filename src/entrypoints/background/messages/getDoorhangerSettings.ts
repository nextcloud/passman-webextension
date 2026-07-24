import { onMessage } from "@/entrypoints/background/messaging";
import {
    DEFAULT_DOORHANGER_SETTINGS,
    type DoorhangerSettings
} from "~/lib/doorhanger/doorhangerSettings";

export type GetDoorhangerSettingsResponse = DoorhangerSettings;

/**
 * Returns Doorhanger layout/gravity.
 */
onMessage('getDoorhangerSettings', async () => {
    return { ...DEFAULT_DOORHANGER_SETTINGS };
});
