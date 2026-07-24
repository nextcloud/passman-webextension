import { onMessage } from "@/entrypoints/background/messaging";
import {
    DoorhangerPendingCredentialService,
    type PendingDoorhangerCredential
} from "~/services/backend/DoorhangerPendingCredentialService";

export type GetPendingDoorhangerCredentialResponse = {
    status: boolean;
    pending?: PendingDoorhangerCredential | null;
    errorMessage?: string;
};

onMessage('getPendingDoorhangerCredential', async (message) => {
    const tabId = message.sender?.tab?.id;

    if (tabId === undefined) {
        return {
            status: false,
            pending: null,
            errorMessage: 'no_source_tab_found'
        };
    }

    return {
        status: true,
        pending: DoorhangerPendingCredentialService.get(tabId)
    };
});
