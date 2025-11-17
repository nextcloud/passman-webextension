import ClipboardService from "@/services/frontend/ClipboardService";
import { LegacyFormManagerService } from "@/services/frontend/LegacyFormManagerService";

export enum RemoteCallableFunctionNames {
    copyText = "copyText",
    enterLoginDetails = "enterLoginDetails",
    reloadPicker = "reloadPicker"
}

// Single source of truth: Define argument types once
export type EnterLoginDetailsArgs = {
    email?: string,
    otp?: string,
    password?: string,
    username?: string,
    enableEmailAsUsernameFallbackFilling?: boolean
};

// Define argument types for all functions
export type RemoteCallableFunctionArgsTypes = {
    [RemoteCallableFunctionNames.copyText]: string,
    [RemoteCallableFunctionNames.enterLoginDetails]: EnterLoginDetailsArgs,
    [RemoteCallableFunctionNames.reloadPicker]: void
}

// Define return types for all functions
export type RemoteCallableFunctionReturnTypes = {
    [RemoteCallableFunctionNames.copyText]: void,
    [RemoteCallableFunctionNames.enterLoginDetails]: boolean,
    [RemoteCallableFunctionNames.reloadPicker]: void
}

// Build function signatures from args and return types
export type RemoteCallableFunctionTypes = {
    [K in RemoteCallableFunctionNames]: RemoteCallableFunctionArgsTypes[K] extends void
        ? () => RemoteCallableFunctionReturnTypes[K]
        : (args: RemoteCallableFunctionArgsTypes[K]) => RemoteCallableFunctionReturnTypes[K]
}

// Create a discriminated union for proper type narrowing
export type RemoteCallableFunctionMessagingRequest =
    | { method: RemoteCallableFunctionNames.copyText, args: RemoteCallableFunctionArgsTypes[RemoteCallableFunctionNames.copyText] }
    | { method: RemoteCallableFunctionNames.enterLoginDetails, args: RemoteCallableFunctionArgsTypes[RemoteCallableFunctionNames.enterLoginDetails] }
    | { method: RemoteCallableFunctionNames.reloadPicker, args?: RemoteCallableFunctionArgsTypes[RemoteCallableFunctionNames.reloadPicker] }

export class RemoteCallableFunctions {
    public static readonly remoteFunctionCallMessageName = 'remoteFunctionCall';

    private static reloadPickerCallback: () => void;

    public static readonly getRemoteCallableFunction = <K extends RemoteCallableFunctionNames>(functionName: K): RemoteCallableFunctionTypes[K] => {
        // @ts-ignore
        return RemoteCallableFunctions[functionName];
    }

    private static readonly copyText: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.copyText] = (text)
        : RemoteCallableFunctionReturnTypes[RemoteCallableFunctionNames.copyText] => {
        ClipboardService.copyToClipboard(text);
    }

    private static readonly enterLoginDetails: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.enterLoginDetails] = (args)
        : RemoteCallableFunctionReturnTypes[RemoteCallableFunctionNames.enterLoginDetails] => {
        LegacyFormManagerService.fillFields(
            args.username,
            args.email,
            args.password,
            args.otp,
            args.enableEmailAsUsernameFallbackFilling
        );
        return true;
    }

    private static readonly reloadPicker: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.reloadPicker] = () => {
        console.debug('Reloading picker for current tab, because of remote function call');
        return this.reloadPickerCallback();
    }

    public static readonly setReloadPickerCallback = (callback: () => void) => {
        this.reloadPickerCallback = callback;
    }
}
