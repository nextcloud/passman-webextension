import CustomStorageService from "./CustomStorageService";
import { PassmanClient } from "@binsky/passman-client-ts";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServerMessagingConnector } from "@/lib/NextcloudServerMessagingConnector";
import { CustomPassmanClientLoggingService } from "./frontend/CustomPassmanClientLoggingService";
import { BackendPassmanClient } from "@/lib/BackendPassmanClient";
import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import { PageRulesStorageInterface } from "./PageRulesService";

/**
 * Do not change the order, once defined! Todo: needs migration for for string keys.
 */
export enum ExtensionSettingsOptions {
    nextcloudServerAuthInfo,
    defaultVaultInfo,
    offlineCacheEnabled,
    ignoreProtocol,
    ignoreSubdomain,
    ignorePath,
    ignorePort,
    autofillEnabled,
    passwordGeneratorConfiguration,
    enableEmailAsUsernameFallbackFilling,

    /**
     * Do not access this setting directly, use PageRulesService instead!
     */
    pageRules,

    /**
     * Use this as form detection default strategy since it should cover most cases by best performance ratio.
     */
    enableUserEventBasedFormDetection,
    enableFormDetectionOnUrlPopstateEvents,
    enableFormDetectionOnUrlChangesByInterval,
    enableFormDetectionByMutationObserver,
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
    [ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling]: boolean,
    [ExtensionSettingsOptions.passwordGeneratorConfiguration]: PasswordGeneratorConfigurationInterface,
    [ExtensionSettingsOptions.pageRules]: PageRulesStorageInterface,
    [ExtensionSettingsOptions.enableUserEventBasedFormDetection]: boolean,
    [ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents]: boolean,
    [ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval]: boolean,
    [ExtensionSettingsOptions.enableFormDetectionByMutationObserver]: boolean,
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

    /**
     * @param key
     * @param value
     * @throws DOMException
     */
    public static updatePartialExtensionSettings = async <K extends ExtensionSettingsOptions>(key: K, value: ExtensionSettings[K]) => {
        try {
            const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
            extensionSettings[key] = value;
            return ExtensionSettingsService.updateExtensionSettings(extensionSettings);
        } catch (e) {
            CustomStorageService.closeSecureStorage();
            console.error('Tried to access and update SecureStorage without a password set.');
            throw e;
        }
    };

    /**
     * @throws DOMException OperationError from SecureStorage.get(...) when trying to decrypt with an invalid key
     */
    public static getExtensionSettings = async () => {
        return await CustomStorageService.getSecureStorage().then(async (myStorage) => {
            return ((await myStorage.get(ExtensionSettingsService.EXTENSION_SETTINGS_ACCESS_KEY)) ?? {}) as ExtensionSettings
        })
    };

    /**
     * Get the default value for an extension setting if provided, otherwise return null
     * @param key The key of the extension setting
     */
    protected static getDefaultForExtensionSetting = async <K extends ExtensionSettingsOptions>(key: K): Promise<ExtensionSettings[K] | null> => {
        let returnValue: ExtensionSettings[K] | null = null;
        switch (key) {
            case ExtensionSettingsOptions.ignoreProtocol:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.ignoreSubdomain:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.ignorePath:
                returnValue = true as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.ignorePort:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.autofillEnabled:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling:
                returnValue = true as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.passwordGeneratorConfiguration:
                returnValue = PasswordGeneratorService.getDefaultConfig() as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.enableUserEventBasedFormDetection:
                returnValue = true as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval:
                returnValue = false as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.enableFormDetectionByMutationObserver:
                returnValue = false as ExtensionSettings[K];
                break;
            default:
                returnValue = null;
                break;
        }
        return returnValue;
    }

    public static getPartialExtensionSettings = async <K extends ExtensionSettingsOptions>(key: K, tryDefault: boolean = false): Promise<ExtensionSettings[K] | null> => {
        let extensionSettings = null;
        try {
            extensionSettings = await ExtensionSettingsService.getExtensionSettings();
        } catch (e) {
            // we may get a SecureStorage access without password, this is expected for some edge-cases
            // usually no need to log or to inform the user
        }
        return extensionSettings?.[key] ?? (tryDefault ? await ExtensionSettingsService.getDefaultForExtensionSetting(key) : null);
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
            const nextcloudServerData = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo) as NextcloudServerInfoInterface;
            const persistence = CustomStorageService.getExtensionPassmanClientPersistenceService();
            // Shared IndexedDB model store with the background client; restore fills preloaded/full vaults offline
            // Both clients will work on the same IndexedDB model store, so they will share the same vaults. Transactions are handled automatically by our backing library.
            ExtensionSettingsService.localPassmanClient = await PassmanClient.createInstance(
                nextcloudServerData,
                new NextcloudServerMessagingConnector(nextcloudServerData, logger),
                logger,
                persistence
            );
        }

        return ExtensionSettingsService.localPassmanClient;
    };

    public static updateBackendPassmanClient = (backendPassmanClient: BackendPassmanClient | null) => {
        ExtensionSettingsService.backendPassmanClient = backendPassmanClient;
    };
}
