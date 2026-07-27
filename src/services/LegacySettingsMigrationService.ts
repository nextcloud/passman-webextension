/**
 * This service was created primarily by AI, but has been manually reviewed and adjusted by a human developer.
 */

import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { PassmanCrypto } from "@binsky/passman-client-ts/lib/Service/PassmanCrypto";
import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";
import {
    DEFAULT_DOORHANGER_GRAVITY,
    DEFAULT_DOORHANGER_LAYOUT,
} from "~/lib/doorhanger/doorhangerSettings";
import { DEFAULT_EXTENSION_LOG_LEVEL } from "~/lib/extensionLogLevel";
import CustomStorageService from "./CustomStorageService";
import ExtensionSettingsService, {
    DefaultVaultInfo,
    ExtensionSettings,
    ExtensionSettingsOptions,
} from "./ExtensionSettingsService";
import ExtensionUnlockService from "./ExtensionUnlockService";
import PageRulesService, { PageRulesStorageInterface } from "./PageRulesService";
import { logger } from "./ConsoleLoggingService";

/** Raw blob under browser.storage.local key `settings` (legacy MV2). */
export interface LegacyExtensionSettingsBlob {
    accounts?: string | unknown;
    ignoreProtocol?: boolean;
    ignoreSubdomain?: boolean;
    ignorePath?: boolean;
    ignorePort?: boolean;
    enableAutoFill?: boolean;
    disableAutoFill?: boolean;
    ignored_sites?: string[];
    generatedPasswordLength?: number;
    debug?: boolean;
    [key: string]: unknown;
}

export interface LegacyAccount {
    nextcloud_host: string;
    nextcloud_username: string;
    nextcloud_password: string;
    vault?: {
        guid?: string;
        name?: string;
        [key: string]: unknown;
    };
    vault_password?: string;
}

/** Decrypted legacy settings ready for mapping (accounts plaintext). */
export interface DecryptedLegacyExtensionSettings extends Omit<LegacyExtensionSettingsBlob, "accounts"> {
    accounts: LegacyAccount[];
}

export interface LegacyMigrationResult {
    connectionCount: number;
    activeConnectionId: string;
}

export interface LegacyMigrationPreview {
    masterPassword: string;
    extensionSettings: ExtensionSettings;
    activeConnectionId: string;
}

export class LegacySettingsMigrationError extends Error {
    constructor(
        message: string,
        public readonly code: "invalid_password" | "no_accounts" | "no_legacy_data" | "already_setup"
    ) {
        super(message);
        this.name = "LegacySettingsMigrationError";
    }
}

/**
 * Imports settings from the legacy MV2 extension (`browser.storage.local.settings`).
 * Does not auto-run on install/startup — only via explicit user action (setup UI).
 */
export default class LegacySettingsMigrationService {
    public static readonly LEGACY_SETTINGS_KEY = "settings";
    public static readonly LEGACY_MASTER_PASSWORD_KEY = "master_password";
    public static readonly IMPORTED_FLAG = "migration.legacySettingsImported";

    /**
     * True when a migratable legacy settings blob is present and setup has not completed yet.
     */
    public static async hasLegacyData(): Promise<boolean> {
        if (await ExtensionUnlockService.isSetupDone()) {
            return false;
        }
        const storage = CustomStorageService.getUnsafeLocalStorage();
        if (await storage.get<boolean>(this.IMPORTED_FLAG)) {
            return false;
        }
        const settings = await storage.get<LegacyExtensionSettingsBlob>(this.LEGACY_SETTINGS_KEY);
        return this.isLegacySettingsPresent(settings);
    }

    /**
     * Optional plaintext master password left by the legacy "remember" feature.
     */
    public static async peekRememberedMasterPassword(): Promise<string | null> {
        const password = await CustomStorageService.getUnsafeLocalStorage()
            .get<string | null>(this.LEGACY_MASTER_PASSWORD_KEY);
        return typeof password === "string" && password.length > 0 ? password : null;
    }

    /**
     * Decrypt and map legacy settings without writing anything.
     * Used by the /setup/migrate review UI.
     */
    public static async previewFromLegacy(masterPassword: string): Promise<LegacyMigrationPreview> {
        if (await ExtensionUnlockService.isSetupDone()) {
            throw new LegacySettingsMigrationError(
                "Extension setup is already complete.",
                "already_setup"
            );
        }

        const storage = CustomStorageService.getUnsafeLocalStorage();
        const rawSettings = await storage.get<LegacyExtensionSettingsBlob>(this.LEGACY_SETTINGS_KEY);
        if (!this.isLegacySettingsPresent(rawSettings)) {
            throw new LegacySettingsMigrationError(
                "No legacy extension settings found.",
                "no_legacy_data"
            );
        }

        const decrypted = this.decryptLegacySettings(rawSettings!, masterPassword);
        if (decrypted.accounts.length < 1) {
            throw new LegacySettingsMigrationError(
                "Legacy settings contain no accounts.",
                "no_accounts"
            );
        }

        const { extensionSettings, activeConnectionId } =
            this.mapLegacySettingsToExtensionSettings(decrypted);

        return {
            masterPassword,
            extensionSettings,
            activeConnectionId,
        };
    }

    /**
     * Persist a (possibly user-edited) ExtensionSettings snapshot from the migrate review UI.
     * Uses the legacy master password as the new extension unlock password.
     */
    public static async commitMigration(
        unlockPassword: string,
        extensionSettings: ExtensionSettings
    ): Promise<LegacyMigrationResult> {
        if (await ExtensionUnlockService.isSetupDone()) {
            throw new LegacySettingsMigrationError(
                "Extension setup is already complete.",
                "already_setup"
            );
        }

        // remove duplicated connections
        const initialConnections = extensionSettings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [];
        const uniqueConnections = initialConnections.filter((c, index, self) =>
            index === self.findIndex((t) => PassmanServerConnection.buildConnectionId(t) === PassmanServerConnection.buildConnectionId(c))
        );
        extensionSettings[ExtensionSettingsOptions.nextcloudServerConnections] = uniqueConnections;

        if (uniqueConnections.length < 1) {
            throw new LegacySettingsMigrationError(
                "Legacy settings contain no accounts.",
                "no_accounts"
            );
        }

        const activeConnectionId =
            extensionSettings[ExtensionSettingsOptions.activeConnectionId]
            ?? PassmanServerConnection.buildConnectionId(uniqueConnections[0]);

        await ExtensionUnlockService.setUpExtensionPassword(unlockPassword);
        await ExtensionSettingsService.updateExtensionSettings(extensionSettings);
        await ExtensionUnlockService.setSetupDone();

        const storage = CustomStorageService.getUnsafeLocalStorage();
        await storage.set(this.IMPORTED_FLAG, true);
        await storage.remove(this.LEGACY_SETTINGS_KEY);
        await storage.remove(this.LEGACY_MASTER_PASSWORD_KEY);

        logger.info(
            `[migration] Imported ${uniqueConnections.length} legacy account(s); active=${activeConnectionId}`
        );

        return {
            connectionCount: uniqueConnections.length,
            activeConnectionId,
        };
    }

    /**
     * Decrypt → map → commit in one step (no review UI).
     */
    public static async migrateFromLegacy(masterPassword: string): Promise<LegacyMigrationResult> {
        const preview = await this.previewFromLegacy(masterPassword);
        return this.commitMigration(preview.masterPassword, preview.extensionSettings);
    }

    /**
     * Rebuild connection directory mirrors after the user edits connections / active id / vaults.
     */
    public static syncConnectionMirrors(
        connections: NextcloudServerInfoInterface[],
        activeConnectionId: string,
        vaultInfoByConnection: Record<string, DefaultVaultInfo>
    ): Pick<
        ExtensionSettings,
        | ExtensionSettingsOptions.nextcloudServerConnections
        | ExtensionSettingsOptions.activeConnectionId
        | ExtensionSettingsOptions.nextcloudServerAuthInfo
        | ExtensionSettingsOptions.defaultVaultInfo
        | ExtensionSettingsOptions.defaultVaultInfoByConnection
    > {
        const active =
            connections.find((c) => PassmanServerConnection.buildConnectionId(c) === activeConnectionId)
            ?? connections[0];
        const resolvedActiveId = PassmanServerConnection.buildConnectionId(active);
        const activeVault = vaultInfoByConnection[resolvedActiveId];

        return {
            [ExtensionSettingsOptions.nextcloudServerConnections]: connections,
            [ExtensionSettingsOptions.activeConnectionId]: resolvedActiveId,
            [ExtensionSettingsOptions.nextcloudServerAuthInfo]: active,
            [ExtensionSettingsOptions.defaultVaultInfo]: activeVault ?? { guid: "", name: "", password: "" },
            [ExtensionSettingsOptions.defaultVaultInfoByConnection]: vaultInfoByConnection,
        };
    }

    public static mapIgnoredSitesListToPageRules(sites: string[]): PageRulesStorageInterface {
        return this.mapIgnoredSitesToPageRules(sites);
    }

    public static pageRulesToIgnoredSitesList(pageRules: PageRulesStorageInterface | null | undefined): string[] {
        if (!pageRules) {
            return [];
        }
        return Object.entries(pageRules)
            .filter(([, rule]) => rule?.ignorePage === true)
            .map(([origin]) => origin);
    }

    /**
     * Decrypt the encrypted `accounts` field and return a plaintext legacy settings object.
     * @throws LegacySettingsMigrationError with code `invalid_password` when decrypt fails
     */
    public static decryptLegacySettings(
        rawSettings: LegacyExtensionSettingsBlob,
        masterPassword: string
    ): DecryptedLegacyExtensionSettings {
        const encryptedAccounts = rawSettings.accounts;
        if (typeof encryptedAccounts !== "string" || encryptedAccounts.length === 0) {
            throw new LegacySettingsMigrationError(
                "Legacy accounts field is missing or not encrypted.",
                "invalid_password"
            );
        }

        let accountsJson: string;
        try {
            accountsJson = PassmanCrypto.decryptString(encryptedAccounts, masterPassword);
        } catch {
            throw new LegacySettingsMigrationError(
                "Invalid legacy master password.",
                "invalid_password"
            );
        }

        let accounts: unknown;
        try {
            accounts = JSON.parse(accountsJson);
        } catch {
            throw new LegacySettingsMigrationError(
                "Invalid legacy master password.",
                "invalid_password"
            );
        }

        if (!Array.isArray(accounts)) {
            throw new LegacySettingsMigrationError(
                "Legacy accounts payload is not an array.",
                "no_accounts"
            );
        }

        const { accounts: _ignored, ...rest } = rawSettings;
        return {
            ...rest,
            accounts: accounts as LegacyAccount[],
        };
    }

    /**
     * Pure mapper: decrypted legacy settings → ExtensionSettings + active connection id.
     * First account becomes the active connection and singular auth/vault mirrors.
     */
    public static mapLegacySettingsToExtensionSettings(
        decrypted: DecryptedLegacyExtensionSettings
    ): { extensionSettings: ExtensionSettings; activeConnectionId: string } {
        const connections: NextcloudServerInfoInterface[] = [];
        const connectionIds: string[] = [];
        const vaultInfoByConnection: Record<string, DefaultVaultInfo> = {};

        for (const account of decrypted.accounts) {
            const serverData: NextcloudServerInfoInterface = {
                baseUrl: (account.nextcloud_host ?? "").replace(/\/$/, ""),
                user: account.nextcloud_username ?? "",
                token: account.nextcloud_password ?? "",
                persistence: "",
            };
            const connectionId = PassmanServerConnection.buildConnectionId(serverData);
            if (connectionIds.includes(connectionId)) {
                logger.warn(`[migration] Multiple connections with for the same account are not supported, skipping the second one: ${connectionId}`);
                continue;
            }
            connections.push(serverData);
            connectionIds.push(connectionId);

            const guid = account.vault?.guid ?? "";
            const name = account.vault?.name ?? "";
            const password = account.vault_password ?? "";
            if (guid && password) {
                // require guid and password to be present for a valid vault
                vaultInfoByConnection[connectionId] = { guid, name, password };
            }
        }

        if (connections.length < 1) {
            throw new LegacySettingsMigrationError(
                "Legacy settings contain no accounts.",
                "no_accounts"
            );
        }

        const firstConnection = connections[0];
        const activeConnectionId = PassmanServerConnection.buildConnectionId(firstConnection);
        const firstVault = vaultInfoByConnection[activeConnectionId];

        const passwordGeneratorConfiguration = PasswordGeneratorService.getDefaultConfig();
        if (
            typeof decrypted.generatedPasswordLength === "number" &&
            decrypted.generatedPasswordLength > 0
        ) {
            passwordGeneratorConfiguration.length = decrypted.generatedPasswordLength;
        }

        const autofillEnabled =
            typeof decrypted.enableAutoFill === "boolean"
                ? decrypted.enableAutoFill
                : typeof decrypted.disableAutoFill === "boolean"
                    ? !decrypted.disableAutoFill
                    : false;

        const extensionSettings = {
            [ExtensionSettingsOptions.nextcloudServerAuthInfo]: firstConnection,
            [ExtensionSettingsOptions.defaultVaultInfo]: firstVault ?? null,
            [ExtensionSettingsOptions.offlineCacheEnabled]: false,
            [ExtensionSettingsOptions.ignoreProtocol]: decrypted.ignoreProtocol ?? false,
            [ExtensionSettingsOptions.ignoreSubdomain]: decrypted.ignoreSubdomain ?? false,
            [ExtensionSettingsOptions.ignorePath]: decrypted.ignorePath ?? true,
            [ExtensionSettingsOptions.ignorePort]: decrypted.ignorePort ?? false,
            [ExtensionSettingsOptions.autofillEnabled]: autofillEnabled,
            [ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling]: true,
            [ExtensionSettingsOptions.passwordGeneratorConfiguration]: passwordGeneratorConfiguration,
            [ExtensionSettingsOptions.pageRules]: this.mapIgnoredSitesToPageRules(
                Array.isArray(decrypted.ignored_sites) ? decrypted.ignored_sites : []
            ),
            [ExtensionSettingsOptions.enableUserEventBasedFormDetection]: true,
            [ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents]: false,
            [ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval]: false,
            [ExtensionSettingsOptions.enableFormDetectionByMutationObserver]: false,
            [ExtensionSettingsOptions.nextcloudServerConnections]: connections,
            [ExtensionSettingsOptions.activeConnectionId]: activeConnectionId,
            [ExtensionSettingsOptions.defaultVaultInfoByConnection]: vaultInfoByConnection,
            [ExtensionSettingsOptions.doorhangerLayout]: DEFAULT_DOORHANGER_LAYOUT,
            [ExtensionSettingsOptions.doorhangerGravity]: DEFAULT_DOORHANGER_GRAVITY,
            [ExtensionSettingsOptions.logLevel]: decrypted.debug === true ? "debug" : DEFAULT_EXTENSION_LOG_LEVEL,
        } as ExtensionSettings;

        return { extensionSettings, activeConnectionId };
    }

    private static isLegacySettingsPresent(settings: LegacyExtensionSettingsBlob | undefined): boolean {
        if (!settings || typeof settings !== "object") {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(settings, "accounts")
            && settings.accounts !== undefined
            && settings.accounts !== null;
    }

    private static mapIgnoredSitesToPageRules(sites: string[]): PageRulesStorageInterface {
        const pageRules: PageRulesStorageInterface = {};
        for (const site of sites) {
            if (typeof site !== "string" || site.trim() === "") {
                continue;
            }
            let originKey: string;
            try {
                originKey = PageRulesService.urlToOrigin(site);
            } catch {
                originKey = site;
            }
            pageRules[originKey] = {
                ...PageRulesService.getFreshPageRules(),
                ignorePage: true,
            };
        }
        return pageRules;
    }
}
