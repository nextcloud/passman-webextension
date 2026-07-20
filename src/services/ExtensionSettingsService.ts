import CustomStorageService from "./CustomStorageService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import { PageRulesStorageInterface } from "./PageRulesService";

export type DefaultVaultInfo = {
    guid: string,
    name: string,
    password: string
};

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

    /** Saved Nextcloud server connections (directory). */
    nextcloudServerConnections,
    /** connectionId of the active Nextcloud server connection. */
    activeConnectionId,
    /** Default vault info keyed by connectionId. */
    defaultVaultInfoByConnection,
}

export interface ExtensionSettings {
    [ExtensionSettingsOptions.nextcloudServerAuthInfo]: NextcloudServerInfoInterface,
    [ExtensionSettingsOptions.defaultVaultInfo]: DefaultVaultInfo,
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
    [ExtensionSettingsOptions.nextcloudServerConnections]: NextcloudServerInfoInterface[],
    [ExtensionSettingsOptions.activeConnectionId]: string,
    [ExtensionSettingsOptions.defaultVaultInfoByConnection]: Record<string, DefaultVaultInfo>,
}

/**
 * Encrypted extension settings storage.
 *
 * Partial previous functionality now in dedicated services:
 * Connection directory mutations: {@link ServerConnectionDirectoryService}.
 * In-memory PassmanClient lifecycle: {@link PassmanClientService}.
 */
export default class ExtensionSettingsService {
    private static readonly EXTENSION_SETTINGS_ACCESS_KEY: string = 'ExtensionSettings';

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
            return ((await myStorage.get(ExtensionSettingsService.EXTENSION_SETTINGS_ACCESS_KEY)) ?? {}) as ExtensionSettings;
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
            case ExtensionSettingsOptions.nextcloudServerConnections:
                returnValue = ([] as NextcloudServerInfoInterface[]) as ExtensionSettings[K];
                break;
            case ExtensionSettingsOptions.defaultVaultInfoByConnection:
                returnValue = ({} as Record<string, DefaultVaultInfo>) as ExtensionSettings[K];
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
}
