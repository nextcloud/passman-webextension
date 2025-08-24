import { RemoteCallableFunctionNames, RemoteCallableFunctions } from "~contents/remoteCallableFunctions";
import PasswordPicker from "./nested/PasswordPicker.svelte";
import contentStylesText from "data-text:../../assets/content_styles/content.scss";
import browser from "webextension-polyfill";

// Modified message listener with error handling
browser.runtime.onMessage.addListener(function (_message, sender, sendResponse) {
    try {
        console.log("[content script] Received message from background script:", _message);
        const message = _message as any;

        if (message.name === RemoteCallableFunctions.remoteFunctionCallMessageName) {
            if (message.body.method && message.body.method in RemoteCallableFunctionNames) {
                console.log("do remoteFunctionCall:", message.body.method);

                const methodName = message.body.method as RemoteCallableFunctionNames;
                const response = RemoteCallableFunctions.getRemoteCallableFunction(methodName)(message.body.args);
                
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

// create closed shadow root container (needed since plasmo-csui does not support closed shadow roots - or it does but it is not working!)
const shadowRootContainerId = "picker-root-container";
const mount = document.createElement("div");
mount.id = shadowRootContainerId;
document.body.appendChild(mount);

const shadowRoot = mount.attachShadow({ mode: "closed" });
const passwordPickerContainer = document.createElement("div");
passwordPickerContainer.classList.add("twp-passman-webextension");

// workaround to prevent host pages from stealing the keydown event for our picker inputs
// see https://gitlab.com/binsky08/passman-webextension-v3/-/issues/22
passwordPickerContainer.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;

        // only forward to inputs/textareas/content-editables
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
            // only handle character keys (skip modifiers, arrows, etc.)
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
    },
    true // use capture so it runs before GitLab's document listeners
);
shadowRoot.appendChild(passwordPickerContainer);

// it seems the contentStylesText import (that's used here) is causing that warning when building the extension:
// DEPRECATION WARNING [legacy-js-api]: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
// More info: https://sass-lang.com/d/legacy-js-api
const style = document.createElement("style");
style.textContent = contentStylesText;
shadowRoot.appendChild(style);

// password picker will be checked and initialized by PasswordPicker.svelte if it is in contents directory;
// since we moved it to nested directory, we need to check for it here
const app = new PasswordPicker({
    target: passwordPickerContainer,
    props: {
        shadowRootContainerId: shadowRootContainerId
    }
});
RemoteCallableFunctions.setReloadPickerCallback(app.loadPickerForCurrentTab);
