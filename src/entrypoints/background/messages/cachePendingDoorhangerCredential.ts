import { onMessage } from "@/entrypoints/background/messaging";
import {
    DoorhangerPendingCredentialService,
    type PendingDoorhangerCredential
} from "~/services/backend/DoorhangerPendingCredentialService";

export type CachePendingDoorhangerCredentialRequest = {
    username?: string;
    email?: string;
    password: string;
    url: string;
    label: string;
    originUrl: string;
};

export type CachePendingDoorhangerCredentialResponse = {
    status: boolean;
    errorMessage?: string;
};

onMessage('cachePendingDoorhangerCredential', async (message) => {
    const tabId = message.sender?.tab?.id;
    const data = message.data;

    if (tabId === undefined) {
        return {
            status: false,
            errorMessage: 'no_source_tab_found'
        };
    }

    if (!data?.password || (!data.username && !data.email)) {
        return {
            status: false,
            errorMessage: 'insufficient_credential_data'
        };
    }

    const pending: PendingDoorhangerCredential = {
        username: data.username,
        email: data.email,
        password: data.password,
        url: data.url,
        label: data.label,
        originUrl: data.originUrl,
        capturedAt: Date.now()
    };

    DoorhangerPendingCredentialService.set(tabId, pending);

    return { status: true };
});
