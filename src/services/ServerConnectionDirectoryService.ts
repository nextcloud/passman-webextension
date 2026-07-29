import ExtensionSettingsService, {
    DefaultVaultInfo,
    ExtensionSettings,
    ExtensionSettingsOptions,
} from "./ExtensionSettingsService";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";

export interface ConnectionDirectory {
    connections: NextcloudServerInfoInterface[];
    activeConnectionId: string | null;
}

/**
 * Persisted Nextcloud connection directory (auth roster, active id, per-connection default vaults)
 * and the singular auth/vault mirrors used by legacy callers.
 *
 * Does not own in-memory {@link PassmanClient} instances. See PassmanClientService for the long-lived client instances.
 */
export default class ServerConnectionDirectoryService {
    /**
     * Seed nextcloudServerConnections from singular nextcloudServerAuthInfo when missing.
     * Persists once when a migration is applied.
     * @returns The migrated extension settings (whether the given or retrieved from the extension settings)
     */
    public static ensureMigrated = async (settings?: ExtensionSettings): Promise<ExtensionSettings> => {
        const extensionSettings = settings ?? await ExtensionSettingsService.getExtensionSettings();
        const authInfo = extensionSettings[ExtensionSettingsOptions.nextcloudServerAuthInfo];
        const connections = extensionSettings[ExtensionSettingsOptions.nextcloudServerConnections];
        if (!authInfo || (connections && connections.length > 0)) {
            return extensionSettings;
        }

        const connectionId = PassmanServerConnection.buildConnectionId(authInfo);
        extensionSettings[ExtensionSettingsOptions.nextcloudServerConnections] = [authInfo];
        extensionSettings[ExtensionSettingsOptions.activeConnectionId] = connectionId;

        const vaultInfoByConnection = extensionSettings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {};
        const defaultVaultInfo = extensionSettings[ExtensionSettingsOptions.defaultVaultInfo];
        if (defaultVaultInfo) {
            vaultInfoByConnection[connectionId] = defaultVaultInfo;
        }
        extensionSettings[ExtensionSettingsOptions.defaultVaultInfoByConnection] = vaultInfoByConnection;

        await ExtensionSettingsService.updateExtensionSettings(extensionSettings);
        return extensionSettings;
    };

    /**
     * Get the connection directory from the extension settings.
     * @returns The connection directory with the connections and the active connection id.
     */
    public static getDirectory = async (): Promise<ConnectionDirectory> => {
        const settings = await ServerConnectionDirectoryService.ensureMigrated();
        return {
            connections: settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? (
                settings[ExtensionSettingsOptions.nextcloudServerAuthInfo]
                    ? [settings[ExtensionSettingsOptions.nextcloudServerAuthInfo]]
                    : []
            ),
            activeConnectionId: settings[ExtensionSettingsOptions.activeConnectionId]
                ?? (settings[ExtensionSettingsOptions.nextcloudServerAuthInfo]
                    ? PassmanServerConnection.buildConnectionId(settings[ExtensionSettingsOptions.nextcloudServerAuthInfo])
                    : null)
        };
    };

    /**
     * Sync nextcloudServerAuthInfo and defaultVaultInfo mirrors from the active connection directory entry.
     * @param connectionId The id of the connection to sync the mirrors for.
     */
    public static syncActiveConnectionMirrors = async (connectionId: string): Promise<void> => {
        const settings = await ServerConnectionDirectoryService.ensureMigrated();
        const connections = settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [];
        const authInfo = connections.find(
            (c) => PassmanServerConnection.buildConnectionId(c) === connectionId
        );
        if (!authInfo) {
            throw new Error(`No connection with id ${connectionId} in the directory.`);
        }

        settings[ExtensionSettingsOptions.activeConnectionId] = connectionId;
        settings[ExtensionSettingsOptions.nextcloudServerAuthInfo] = authInfo;

        const vaultInfoByConnection = settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {};
        const vaultInfo = vaultInfoByConnection[connectionId];
        if (vaultInfo) {
            settings[ExtensionSettingsOptions.defaultVaultInfo] = vaultInfo;
        } else {
            delete (settings as Partial<ExtensionSettings>)[ExtensionSettingsOptions.defaultVaultInfo];
        }

        await ExtensionSettingsService.updateExtensionSettings(settings);
    };

    /**
     * Upsert a connection into the directory and optionally make it active (syncing mirrors).
     * @param serverData The server data to upsert. Will always be the active one if there is no active connection yet.
     * @param makeActive Whether to make the connection active.
     * @param replaceConnectionId When set (e.g. after http to https baseUrl upgrade), remove that old roster
     *   entry and migrate its default-vault mapping to the new connectionId before upserting.
     * @returns The id of the upserted connection.
     */
    public static upsertServerConnection = async (
        serverData: NextcloudServerInfoInterface,
        makeActive: boolean,
        replaceConnectionId?: string
    ): Promise<string> => {
        const connectionId = PassmanServerConnection.buildConnectionId(serverData);
        const settings = await ServerConnectionDirectoryService.ensureMigrated();
        let connections = [...(settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [])];
        const vaultInfoByConnection = { ...(settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {}) };

        if (replaceConnectionId && replaceConnectionId !== connectionId) {
            connections = connections.filter(
                (c) => PassmanServerConnection.buildConnectionId(c) !== replaceConnectionId
            );
            if (vaultInfoByConnection[replaceConnectionId]) {
                vaultInfoByConnection[connectionId] = vaultInfoByConnection[replaceConnectionId];
                delete vaultInfoByConnection[replaceConnectionId];
            }
            if (settings[ExtensionSettingsOptions.activeConnectionId] === replaceConnectionId) {
                settings[ExtensionSettingsOptions.activeConnectionId] = connectionId;
            }
        }

        const existingIndex = connections.findIndex(
            (c) => PassmanServerConnection.buildConnectionId(c) === connectionId
        );
        if (existingIndex >= 0) {
            connections[existingIndex] = serverData;
        } else {
            connections.push(serverData);
        }
        settings[ExtensionSettingsOptions.nextcloudServerConnections] = connections;
        settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] = vaultInfoByConnection;

        if (makeActive || !settings[ExtensionSettingsOptions.activeConnectionId]) {
            settings[ExtensionSettingsOptions.activeConnectionId] = connectionId;
            settings[ExtensionSettingsOptions.nextcloudServerAuthInfo] = serverData;
            const vaultInfo = vaultInfoByConnection[connectionId];
            if (vaultInfo) {
                settings[ExtensionSettingsOptions.defaultVaultInfo] = vaultInfo;
            }
        }

        await ExtensionSettingsService.updateExtensionSettings(settings);
        return connectionId;
    };

    /**
     * Persist default vault for the active connection and update the singular mirror.
     * @param vaultInfo The vault info to set as default.
     */
    public static setDefaultVaultForActiveConnection = async (vaultInfo: DefaultVaultInfo): Promise<void> => {
        const settings = await ServerConnectionDirectoryService.ensureMigrated();
        const activeConnectionId = settings[ExtensionSettingsOptions.activeConnectionId];
        if (!activeConnectionId) {
            const authInfo = settings[ExtensionSettingsOptions.nextcloudServerAuthInfo];
            if (!authInfo) {
                throw new Error('No active connection to attach default vault to.');
            }

            const connectionId = PassmanServerConnection.buildConnectionId(authInfo);
            settings[ExtensionSettingsOptions.activeConnectionId] = connectionId;

            const connections = settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [];
            if (connections.length === 0) {
                settings[ExtensionSettingsOptions.nextcloudServerConnections] = [authInfo];
            }

            const vaultInfoByConnection = settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {};
            vaultInfoByConnection[connectionId] = vaultInfo;
            settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] = vaultInfoByConnection;
            settings[ExtensionSettingsOptions.defaultVaultInfo] = vaultInfo;

            await ExtensionSettingsService.updateExtensionSettings(settings);
            return;
        }

        const vaultByConnection = settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {};
        vaultByConnection[activeConnectionId] = vaultInfo;
        settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] = vaultByConnection;
        settings[ExtensionSettingsOptions.defaultVaultInfo] = vaultInfo;
        await ExtensionSettingsService.updateExtensionSettings(settings);
    };

    /**
     * Remove a connection from the directory. Refuses to remove the last connection.
     * If the removed connection was active, another remaining connection becomes active.
     * @returns the new active connectionId
     */
    public static removeServerConnection = async (connectionId: string): Promise<string> => {
        const settings = await ServerConnectionDirectoryService.ensureMigrated();
        const connections = [...(settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [])];
        if (connections.length <= 1) {
            throw new Error('Cannot remove the last server connection.');
        }

        const filtered = connections.filter(
            (c) => PassmanServerConnection.buildConnectionId(c) !== connectionId
        );
        if (filtered.length === connections.length) {
            throw new Error(`No connection with id ${connectionId} in the directory.`);
        }

        settings[ExtensionSettingsOptions.nextcloudServerConnections] = filtered;

        const vaultInfoByConnection = { ...(settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {}) };
        delete vaultInfoByConnection[connectionId];
        settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] = vaultInfoByConnection;

        let activeConnectionId = settings[ExtensionSettingsOptions.activeConnectionId];
        if (activeConnectionId === connectionId) {
            const nextServerAuthInfo = filtered[0];
            if (!nextServerAuthInfo) {
                // Should never happen due to the previous connections.length check, but just in case.
                throw new Error('No connection left in the directory.');
            }

            activeConnectionId = PassmanServerConnection.buildConnectionId(nextServerAuthInfo);
            settings[ExtensionSettingsOptions.activeConnectionId] = activeConnectionId;
            settings[ExtensionSettingsOptions.nextcloudServerAuthInfo] = nextServerAuthInfo;
            const nextVaultInfo = vaultInfoByConnection[activeConnectionId];
            if (nextVaultInfo) {
                settings[ExtensionSettingsOptions.defaultVaultInfo] = nextVaultInfo;
            } else {
                delete (settings as Partial<ExtensionSettings>)[ExtensionSettingsOptions.defaultVaultInfo];
            }
        }

        await ExtensionSettingsService.updateExtensionSettings(settings);
        return activeConnectionId;
    };
}
