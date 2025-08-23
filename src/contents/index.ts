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
shadowRoot.adoptedStyleSheets = [];

const passwordPickerContainer = document.createElement("div");
shadowRoot.appendChild(passwordPickerContainer);

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
