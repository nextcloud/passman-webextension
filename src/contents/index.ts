import { RemoteCallableFunctionNames, RemoteCallableFunctions } from "~contents/remoteCallableFunctions";

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
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
});
