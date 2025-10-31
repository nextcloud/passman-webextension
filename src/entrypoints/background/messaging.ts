import { defineExtensionMessaging } from '@webext-core/messaging';
import {
    NextcloudServerMessagingConnectorApiRequest,
    NextcloudServerMessagingConnectorApiResponse
} from "@/entrypoints/background/messages/nextcloudServerMessagingConnectorApi";
import { PingResponse } from "@/entrypoints/background/messages/ping";
import { UnlockExtensionRequest, UnlockExtensionResponse } from "@/entrypoints/background/messages/unlockExtension";
import { LockExtensionResponse } from "@/entrypoints/background/messages/lockExtension";
import { SetDefaultVaultRequest, SetDefaultVaultResponse } from "@/entrypoints/background/messages/setDefaultVault";
import {
    GetPossibleVaultsInfoRequest,
    GetPossibleVaultsInfoResponse
} from "@/entrypoints/background/messages/getPossibleVaultsInfo";
import {
    GetPasswordGeneratorConfigurationMessagingResponse
} from "@/entrypoints/background/messages/getPasswordGeneratorConfiguration";
import {
    GetCredentialsListMessagingConfiguration,
    GetCredentialsListMessagingResponse
} from "@/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
import { GetExtensionUnlockStateResponse } from "@/entrypoints/background/messages/getExtensionUnlockState";
import { GetAutofillEnabledStateResponse } from "@/entrypoints/background/messages/getAutofillEnabledState";
import {
    CreateCredentialForPickerMessagingRequest,
    CreateCredentialForPickerMessagingResponse
} from "@/entrypoints/background/messages/createCredentialForPicker";
import {
    AddNewServerConnectionRequest,
    AddNewServerConnectionResponse
} from "@/entrypoints/background/messages/addNewServerConnection";
import {
    GetCredentialsForVaultMessagingRequest,
    GetCredentialsForVaultMessagingResponse
} from "@/entrypoints/background/messages/getCredentialsForVault";
import {
    RemoteCallableFunctionMessagingRequest,
    RemoteCallableFunctions
} from "@/entrypoints/content/remoteCallableFunctions";

interface ProtocolMap {
    ping(): PingResponse;

    nextcloudServerMessagingConnectorApi(data: NextcloudServerMessagingConnectorApiRequest): NextcloudServerMessagingConnectorApiResponse;

    unlockExtension(data: UnlockExtensionRequest): UnlockExtensionResponse;

    lockExtension(): LockExtensionResponse;

    setDefaultVault(data: SetDefaultVaultRequest): SetDefaultVaultResponse;

    getPossibleVaultsInfo(data?: GetPossibleVaultsInfoRequest): GetPossibleVaultsInfoResponse;

    getPasswordGeneratorConfiguration(): GetPasswordGeneratorConfigurationMessagingResponse;

    getPartiallyDecryptedFilteredCredentialsList(data: GetCredentialsListMessagingConfiguration): GetCredentialsListMessagingResponse;

    getExtensionUnlockState(): GetExtensionUnlockStateResponse;

    getAutofillEnabledState(): GetAutofillEnabledStateResponse;

    createCredentialForPicker(data?: CreateCredentialForPickerMessagingRequest): CreateCredentialForPickerMessagingResponse;

    addNewServerConnection(data: AddNewServerConnectionRequest): AddNewServerConnectionResponse;

    getCredentialsForVault(data: GetCredentialsForVaultMessagingRequest): GetCredentialsForVaultMessagingResponse;

    // content script
    [RemoteCallableFunctions.remoteFunctionCallMessageName](data: RemoteCallableFunctionMessagingRequest): boolean | null | void;
}

type MyMessageListenerDto<TType extends keyof ProtocolMap> = {
    name: Parameters<typeof onMessage<TType>>[0],
    listener: Parameters<typeof onMessage<TType>>[1]
};
const messageListener: MyMessageListenerDto<any>[] = [];

/**
 * Custom function to collect onMessage listener definitions to apply them later (slightly delayed) to the runtime,
 * by manually calling executeOnMessageListenerRegistration() once in the background entrypoint (like within defineBackground WXT function).
 *
 * Using onMessageRegisterer (masked as onMessage) instead of directly using the original onMessage should not be strictly necessary to obtain a functioning extension.
 * However, this structure was very useful when troubleshooting messaging issues. (Therefore, I will keep it for now.)
 *
 * @param name
 * @param listener
 */
const onMessageRegisterer = <TType extends keyof ProtocolMap>(...[name, listener]: Parameters<typeof onMessage<TType>>): ReturnType<typeof onMessage<TType>> => {
    messageListener.push({ name, listener });

    // return a RemoveListenerCallback
    return () => {
        const index = messageListener.findIndex((item) => item.name === name);
        if (index !== -1) {
            messageListener.splice(index, 1);
        }
    };
};
export const executeOnMessageListenerRegistration = () => {
    for (const myMessageListenerDto of messageListener) {
        onMessage(myMessageListenerDto.name, myMessageListenerDto.listener);
    }
};

const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

export { sendMessage, onMessageRegisterer as onMessage };
