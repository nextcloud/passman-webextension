import ClipboardService from "~services/frontend/ClipboardService";

export enum RemoteCallableFunctionNames {
    copyText = "copyText",
    enterLoginDetails = "enterLoginDetails"
}

export interface RemoteCallableFunctionTypes {
    [RemoteCallableFunctionNames.copyText]: (text: string) => void,
    [RemoteCallableFunctionNames.enterLoginDetails]: (args: { password?: string }) => boolean
}

export interface RemoteCallableFunctionReturnTypes {
    [RemoteCallableFunctionNames.copyText]: void,
    [RemoteCallableFunctionNames.enterLoginDetails]: boolean
}

export class RemoteCallableFunctions {
    public static readonly remoteFunctionCallMessageName = 'remoteFunctionCall';

    public static getRemoteCallableFunction = <K extends RemoteCallableFunctionNames>(functionName: K): RemoteCallableFunctionTypes[K] => {
        // @ts-ignore
        return RemoteCallableFunctions[functionName];
    }

    private static copyText: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.copyText] = (text: string)
        : RemoteCallableFunctionReturnTypes[RemoteCallableFunctionNames.copyText] => {
        ClipboardService.copyToClipboard(text);
    }

    private static enterLoginDetails: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.enterLoginDetails] = (args: { password?: string })
        : RemoteCallableFunctionReturnTypes[RemoteCallableFunctionNames.enterLoginDetails] => {
        // todo: implement
        return true;
    }
}
