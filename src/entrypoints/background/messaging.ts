import { defineExtensionMessaging } from '@webext-core/messaging';
import {
    NextcloudServerMessagingConnectorApiRequest, NextcloudServerMessagingConnectorApiResponse
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
    GetCredentialsListMessagingConfiguration, GetCredentialsListMessagingResponse
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
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
