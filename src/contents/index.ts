import { RemoteCallableFunctionNames, RemoteCallableFunctions } from "~contents/remoteCallableFunctions";
import PasswordPicker from "./nested/PasswordPicker.svelte";
import passwordPickerCssText from "data-text:../../assets/content_styles/password_picker.css";

// Modified message listener with error handling
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    try {
        console.log("[content script] Received message from background script:", message);

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
        return true; // Keep the message channel open for async responses
    } catch (e) {
        console.error("[content script] Error processing message:", e);
        return false;
    }
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
style.textContent = passwordPickerCssText;
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
