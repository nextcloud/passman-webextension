import CustomStorageService from "~services/CustomStorageService";
import { PassmanClient } from "@binsky/passman-client-ts";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServerMessagingConnector } from "~lib/NextcloudServerMessagingConnector";
import { CustomPassmanClientLoggingService } from "~services/frontend/CustomPassmanClientLoggingService";
import { BackendPassmanClient } from "~lib/BackendPassmanClient";

export enum ExtensionSettingsOptions {
    nextcloudServerAuthInfo,
    defaultVaultInfo,
    offlineCacheEnabled,
    ignoreProtocol,
    ignoreSubdomain,
    ignorePath,
    ignorePort,
    autofillEnabled
}

export interface ExtensionSettings {
    [ExtensionSettingsOptions.nextcloudServerAuthInfo]: NextcloudServerInfoInterface,
    [ExtensionSettingsOptions.defaultVaultInfo]: {
        guid: string,
        password: string
    },
    [ExtensionSettingsOptions.offlineCacheEnabled]: boolean,
    [ExtensionSettingsOptions.ignoreProtocol]: boolean,
    [ExtensionSettingsOptions.ignoreSubdomain]: boolean,
    [ExtensionSettingsOptions.ignorePath]: boolean,
    [ExtensionSettingsOptions.ignorePort]: boolean,
    [ExtensionSettingsOptions.autofillEnabled]: boolean,
}

export default class ExtensionSettingsService {
    private static readonly EXTENSION_SETTINGS_ACCESS_KEY: string = 'ExtensionSettings';
    private static backendPassmanClient: BackendPassmanClient | null = null;
    private static localPassmanClient: PassmanClient | null = null;

    public static updateExtensionSettings = async (extensionSettings: ExtensionSettings) => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return await myStorage.set(ExtensionSettingsService.EXTENSION_SETTINGS_ACCESS_KEY, extensionSettings)
        })
    };

    public static updatePartialExtensionSettings = async <K extends ExtensionSettingsOptions>(key: K, value: ExtensionSettings[K]) => {
        const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
        extensionSettings[key] = value;
        return ExtensionSettingsService.updateExtensionSettings(extensionSettings);
    };

    public static getExtensionSettings = async () => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return ((await myStorage.get(ExtensionSettingsService.EXTENSION_SETTINGS_ACCESS_KEY)) ?? {}) as ExtensionSettings
        })
    };

    public static getPartialExtensionSettings = async <K extends ExtensionSettingsOptions>(key: K): Promise<ExtensionSettings[K] | null> => {
        const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
        return extensionSettings[key] ?? null;
    };

    public static getBackendPassmanClient = async () => {
        if (!ExtensionSettingsService.backendPassmanClient) {
            const nextcloudServerData = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo);
            if (nextcloudServerData) {
                const logger = new CustomPassmanClientLoggingService();
                ExtensionSettingsService.backendPassmanClient = await BackendPassmanClient.createInstance(
                    nextcloudServerData,
                    undefined,
                    logger,
                    CustomStorageService.getExtensionPassmanClientPersistenceService()
                );
            }
        }

        return ExtensionSettingsService.backendPassmanClient;
    };

    public static getPopupPassmanClient = async () => {
        if (!ExtensionSettingsService.localPassmanClient) {
            const logger = new CustomPassmanClientLoggingService();
            ExtensionSettingsService.localPassmanClient = await PassmanClient.createInstance(
                null as unknown as NextcloudServerInfoInterface,
                new NextcloudServerMessagingConnector(
                    await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo) as NextcloudServerInfoInterface,
                    logger
                ),
                logger
            );

            // todo: try to get serialized vaults fomr the backend passman client and fill them into this one
            // ExtensionSettingsService.localPassmanClient.
        }

        return ExtensionSettingsService.localPassmanClient;
    };

    public static updateBackendPassmanClient = (backendPassmanClient: BackendPassmanClient | null) => {
        ExtensionSettingsService.backendPassmanClient = backendPassmanClient;
    };
}
