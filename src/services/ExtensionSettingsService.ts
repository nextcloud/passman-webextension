import CustomStorageService from "~services/CustomStorageService";
import { PassmanClient } from "@binsky/passman-client-ts";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServerMessagingConnector } from "~lib/NextcloudServerMessagingConnector";
import { CustomPassmanClientLoggingService } from "~services/CustomPassmanClientLoggingService";

export enum ExtensionSettingsOptions {
    nextcloudServerAuthInfo,
    defaultVaultInfo,
    offlineCacheEnabled,
    ignoreProtocol,
    ignoreSubdomain,
    ignorePath,
    ignorePort
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
}

export default class ExtensionSettingsService {
    private static readonly EXTENSION_SETTINGS_ACCESS_KEY: string = 'ExtensionSettings';
    private static localPassmanClient: PassmanClient = null;

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
            return (await myStorage.get(ExtensionSettingsService.EXTENSION_SETTINGS_ACCESS_KEY) ?? {}) as ExtensionSettings
        })
    };

    public static getPartialExtensionSettings = async <K extends ExtensionSettingsOptions>(key: K): Promise<ExtensionSettings[K] | null> => {
        const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
        return extensionSettings[key] ?? null;
    };

    public static getPassmanClient = async (createWithNextcloudServerMessagingConnector = false) => {
        if (!ExtensionSettingsService.localPassmanClient) {
            if (createWithNextcloudServerMessagingConnector) {
                // only required for PassmanClient usage by the extension frontend
                const logger = new CustomPassmanClientLoggingService();
                ExtensionSettingsService.localPassmanClient = new PassmanClient(
                    null,
                    new NextcloudServerMessagingConnector(
                        await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo),
                        logger
                    ),
                    logger
                );
            } else {
                ExtensionSettingsService.localPassmanClient = new PassmanClient(
                    await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo)
                );
            }
        }

        return ExtensionSettingsService.localPassmanClient;
    };

    public static updatePassmanClient = (passmanClient: PassmanClient) => {
        ExtensionSettingsService.localPassmanClient = passmanClient;
    };
}
