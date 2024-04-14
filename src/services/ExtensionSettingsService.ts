import CustomStorageService from "~services/CustomStorageService";
import { PassmanClient } from "@binsky/passman-client-ts";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServerMessagingConnector } from "~lib/NextcloudServerMessagingConnector";
import { DefaultLoggingService } from "@binsky/passman-client-ts/lib/Service/DefaultLoggingService";

export default class ExtensionSettingsService {
    private static readonly PERSISTENT_AUTH_STORE_ACCESS_KEY: string = 'NextcloudServerAuthInfo';
    private static readonly DEFAULT_VAULT_INFO_ACCESS_KEY: string = 'DefaultVaultInfo';
    private static localPassmanClient: PassmanClient = null;

    public static updateNextcloudServerSettings = async (ncAuthInfo: NextcloudServerInfoInterface) => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return await myStorage.set(ExtensionSettingsService.PERSISTENT_AUTH_STORE_ACCESS_KEY, ncAuthInfo)
        })
    };

    public static getNextcloudServerSettings = async () => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return await myStorage.get(ExtensionSettingsService.PERSISTENT_AUTH_STORE_ACCESS_KEY) as NextcloudServerInfoInterface
        })
    };

    public static getPassmanClient = async (createWithNextcloudServerMessagingConnector = false) => {
        if (!ExtensionSettingsService.localPassmanClient) {
            if (createWithNextcloudServerMessagingConnector) {
                // only required for PassmanClient usage by the extension frontend
                const logger = new DefaultLoggingService();
                ExtensionSettingsService.localPassmanClient = new PassmanClient(
                    null,
                    new NextcloudServerMessagingConnector(
                        await ExtensionSettingsService.getNextcloudServerSettings(),
                        logger
                    ),
                    logger
                );
            } else {
                ExtensionSettingsService.localPassmanClient = new PassmanClient(
                    await ExtensionSettingsService.getNextcloudServerSettings()
                );
            }
        }

        return ExtensionSettingsService.localPassmanClient;
    };

    public static updatePassmanClient = (passmanClient: PassmanClient) => {
        ExtensionSettingsService.localPassmanClient = passmanClient;
    };

    public static setDefaultVaultInfo = async (guid: string, password: string) => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return await myStorage.set(ExtensionSettingsService.DEFAULT_VAULT_INFO_ACCESS_KEY, { guid, password });
        })
    };

    public static getDefaultVaultInfo = async () => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return await myStorage.get(ExtensionSettingsService.DEFAULT_VAULT_INFO_ACCESS_KEY) as {
                guid: string,
                password: string
            }
        })
    };
}
