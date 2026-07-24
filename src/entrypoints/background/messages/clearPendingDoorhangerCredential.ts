import { onMessage } from "@/entrypoints/background/messaging";
import { DoorhangerPendingCredentialService } from "~/services/backend/DoorhangerPendingCredentialService";

export type ClearPendingDoorhangerCredentialResponse = {
    status: boolean;
    errorMessage?: string;
};

onMessage('clearPendingDoorhangerCredential', async (message) => {
    const tabId = message.sender?.tab?.id;

    if (tabId === undefined) {
        return {
            status: false,
            errorMessage: 'no_source_tab_found'
        };
    }

    DoorhangerPendingCredentialService.clear(tabId);

    return { status: true };
});
