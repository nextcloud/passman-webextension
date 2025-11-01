import {
    RemoteCallableFunctionMessagingRequest,
    RemoteCallableFunctionNames,
    RemoteCallableFunctions
} from "./remoteCallableFunctions";
import PasswordPicker from "./nested/PasswordPicker.svelte";
import browser from "webextension-polyfill";
import { mount, unmount } from "svelte";

import "../../../public/content_styles/content.scss";
import "../../../public/content_styles/password_picker.scss";

// Modified message listener with error handling
browser.runtime.onMessage.addListener(function (_message, sender, sendResponse) {
    try {
        console.log("[content script] Received message from background script:", _message);
        const message = _message as {
            data: RemoteCallableFunctionMessagingRequest
            type: string,
            id: number,
            timestamp: number
        };

        if (message.type === RemoteCallableFunctions.remoteFunctionCallMessageName) {
            if (message.data.method && message.data.method in RemoteCallableFunctionNames) {
                console.log("do remoteFunctionCall:", message.data.method);

                const methodName = message.data.method;
                // @ts-expect-error - TypeScript can't correlate method with args type, but discriminated union guarantees correctness
                const response = RemoteCallableFunctions.getRemoteCallableFunction(methodName)(message.data.args);

                // Always send a response to prevent channel closure errors
                sendResponse(response ?? true);
            } else {
                // Send a response for unrecognized methods
                sendResponse(null);
            }
        } else {
            // Send a response for unrecognized messages
            sendResponse(null);
        }
    } catch (e) {
        console.error("[content script] Error processing message:", e);
        sendResponse(null);
    }

    // Always return true to indicate we will respond (even if synchronously)
    return true;
});

const shadowRootContainerId = "picker-root-container";

export default defineContentScript({
    matches: ['<all_urls>'],
    // 2. Set cssInjectionMode
    cssInjectionMode: 'ui',

    async main(ctx) {
        // 3. Define your UI
        const ui = await createShadowRootUi(ctx, {
            name: 'example-ui',
            position: 'inline',
            anchor: 'body',
            //mode: 'closed',
            onMount: (container) => {
                // Create the Svelte app inside the UI container
                // @ts-ignore
                return mount(PasswordPicker, { target: container });
            },
            onRemove: (app) => {
                // Destroy the app when the UI is removed
                // @ts-ignore
                unmount(app);
            },
        });

        ui.shadowHost.id = shadowRootContainerId;

        // 4. Mount the UI
        ui.mount();
        ui.mounted?.setShadowRootContainerId(shadowRootContainerId);
    },
});
