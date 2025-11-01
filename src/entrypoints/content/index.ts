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

/**
 * workaround to prevent host pages from stealing the keydown event for our picker inputs while using a closed shadow root
 * see https://gitlab.com/binsky08/passman-webextension-v3/-/issues/22
 * @param e
 */
const keydownListenerForClosedShadowRootCompatibility = (e: KeyboardEvent) => {
    let target = e.target as HTMLElement;
    // firefox workaround:
    // @ts-ignore
    if (e.originalTarget !== undefined) {
        // @ts-ignore
        target = e.originalTarget;
    }

    // only forward to inputs/textareas/content-editables
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
        // Check if this is a key combination with modifiers (Ctrl, Cmd, Alt)
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

        // Allow browser default behavior for:
        // - Key combinations (Ctrl+V, Ctrl+C, Ctrl+X, Ctrl+A, etc.)
        // - Special keys (Enter, Tab, Escape, Backspace, Delete, Arrow keys, etc.)
        if (hasModifier || e.key.length !== 1) {
            // Only stop propagation to prevent host page from stealing the event
            // but allow default browser behavior for clipboard operations, etc.
            e.stopPropagation();
            return;
        }

        // For plain character keys without modifiers, manually insert them
        // This is necessary because some host pages prevent default on all keydown events
        if (e.key.length === 1) {
            e.stopPropagation();
            e.preventDefault();

            // fix IDE type errors
            const _target = target as HTMLInputElement;

            // insert character at cursor
            const start = _target.selectionStart ?? _target.value.length;
            const end = _target.selectionEnd ?? _target.value.length;
            const before = _target.value.substring(0, start);
            const after = _target.value.substring(end);
            _target.value = before + e.key + after;

            // move cursor
            _target.selectionStart = _target.selectionEnd = start + 1;

            // fire input event so frameworks detect change
            const inputEvent = new Event("input", { bubbles: true, composed: true });
            _target.dispatchEvent(inputEvent);
        }
    }
}

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
            mode: 'closed',
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
        // ui.shadowHost.addEventListener("keydown", keydownListenerForClosedShadowRootCompatibility);
        ui.uiContainer.addEventListener("keydown", keydownListenerForClosedShadowRootCompatibility);

        // 4. Mount the UI
        ui.mount();
        ui.mounted?.setShadowRootContainerId(shadowRootContainerId);
    },
});
