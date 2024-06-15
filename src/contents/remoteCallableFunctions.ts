import ClipboardService from "~services/frontend/ClipboardService";
import { LegacyFormManagerService } from "~services/frontend/LegacyFormManagerService";

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

    private static enterLoginDetails: RemoteCallableFunctionTypes[RemoteCallableFunctionNames.enterLoginDetails] = (args: {
        email?: string,
        otp?: string,
        password?: string,
        username?: string
    })
        : RemoteCallableFunctionReturnTypes[RemoteCallableFunctionNames.enterLoginDetails] => {
        LegacyFormManagerService.fillPassword(
            args.username ?? args.email,
            args.password
        );
        return true;
    }
}
