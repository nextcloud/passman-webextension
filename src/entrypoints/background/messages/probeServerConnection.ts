import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { BackendPassmanClient } from "~/lib/BackendPassmanClient";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export interface ProbeServerConnectionRequest extends NextcloudServerInfoInterface {
    /** Optional vault to validate against the server's vault list after login. */
    vaultGuid?: string;
    vaultPassword?: string;
}

export interface ProbeServerConnectionResponse {
    status: boolean;
    message: string;
    vaultSelectionList: { guid: string; name: string }[];
    /** Present when vaultGuid/vaultPassword were provided. */
    vaultUnlockOk?: boolean;
    backendAppId?: NextcloudServerInfoInterface["backendAppId"];
    /** Final baseUrl after a successful same-host http to https redirect upgrade */
    baseUrl?: string;
}

/**
 * Ephemeral server/vault probe for the legacy migrate review UI.
 * Does not persist connections or extension settings.
 */
onMessage('probeServerConnection', async (message) => {
    const vaultSelectionList: { guid: string; name: string }[] = [];

    try {
        if (!message.data) {
            return {
                status: false,
                message: i18n.getMessage('no_server_info_provided'),
                vaultSelectionList,
            };
        }

        const serverData: NextcloudServerInfoInterface = {
            baseUrl: message.data.baseUrl,
            user: message.data.user,
            token: message.data.token,
            persistence: message.data.persistence ?? '',
            backendAppId: message.data.backendAppId,
        };

        const client = await BackendPassmanClient.createInstance(serverData);
        const previousConnectionId = client.activeConnection.connectionId;
        const loginOk = await client.preloadVaults(true);
        if (!loginOk) {
            return {
                status: false,
                message: i18n.getMessage('login_failed'),
                vaultSelectionList,
                baseUrl: serverData.baseUrl,
            };
        }

        client.syncConnectionIdentity(previousConnectionId);

        for (const preloadedVault of client.preloadedVaults) {
            vaultSelectionList.push({
                guid: preloadedVault.guid,
                name: preloadedVault.name,
            });
        }

        let vaultUnlockOk: boolean | undefined;
        const vaultGuid = message.data.vaultGuid;
        const vaultPassword = message.data.vaultPassword;
        if (vaultGuid && vaultPassword) {
            const preloaded = client.preloadedVaults.find((v) => v.guid === vaultGuid);
            vaultUnlockOk = preloaded ? preloaded.testVaultKey(vaultPassword) : false;
        }

        return {
            status: true,
            message: i18n.getMessage('login_succeeded'),
            vaultSelectionList,
            vaultUnlockOk,
            backendAppId: serverData.backendAppId,
            baseUrl: serverData.baseUrl,
        };
    } catch (e) {
        logger.error(e);
        return {
            status: false,
            message: e instanceof Error
                ? (e.message || i18n.getMessage('login_failed'))
                : i18n.getMessage('unknown_error'),
            vaultSelectionList,
        };
    }
});
