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
                if (response) {
                    sendResponse(response);
                }
            }
        }
    } catch (e) {
        console.error("[content script] Error processing message:", e);
        sendResponse(null);
        // no false response allowed by the polyfill api; try null instead and holding the channel open by returning true
    }
    return true; // Keep the message channel open for async responses
});

// Use regular DOM with isolation instead of Shadow DOM
const createIsolatedContainer = () => {
    // we'll keep the shadow root container id for now, but we'll use the regular DOM with isolation approach instead of the shadow DOM approach
    // that was not working in Firefox due to an Xray wrapper error
    const shadowRootContainerId = "picker-root-container";
    const mount = document.createElement("div");
    mount.id = shadowRootContainerId;
    
    // Style for isolation (replaces shadow DOM isolation approach)
    mount.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        background: transparent !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
    `;

    const passwordPickerContainer = document.createElement("div");
    passwordPickerContainer.style.cssText = `
        position: relative !important;
        pointer-events: auto !important;
    `;
    
    mount.appendChild(passwordPickerContainer);

    // it seems the contentStylesText import (that's used here) is causing that warning when building the extension:
    // DEPRECATION WARNING [legacy-js-api]: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
    // More info: https://sass-lang.com/d/legacy-js-api
    const style = document.createElement("style");
    style.textContent = contentStylesText;
    mount.appendChild(style);
    mount.classList.add("twp-passman-webextension");

    document.body.appendChild(mount);

    return { mount, passwordPickerContainer, shadowRootContainerId };
};

const { passwordPickerContainer, shadowRootContainerId } = createIsolatedContainer();

// password picker will be checked and initialized by PasswordPicker.svelte if it is in contents directory;
// since we moved it to nested directory, we need to check for it here
const app = new PasswordPicker({
    target: passwordPickerContainer,
    props: {
        shadowRootContainerId: shadowRootContainerId
    }
});
RemoteCallableFunctions.setReloadPickerCallback(app.loadPickerForCurrentTab);
