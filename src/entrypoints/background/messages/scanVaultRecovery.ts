import PassmanClientService from "~/services/PassmanClientService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import { VaultRecoveryService } from "@binsky/passman-client-ts/lib/Service/VaultRecovery/VaultRecoveryService";
import type {
    VaultKeyCandidateInterface
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultKeyCandidateInterface";
import type {
    ScanReportInterface
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/ScanReportInterface";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export interface ScanVaultRecoveryRequest {
    candidates: VaultKeyCandidateInterface[];
}

export interface ScanVaultRecoveryResponse {
    status: boolean;
    errorMessage: string | null;
    report: ScanReportInterface | null;
}

/**
 * Read-only vault recovery diagnosis. Loads the default vault fresh (no cache) so a wrong / partially
 * broken vaultKey never short-circuits the credential list, then delegates candidate probing to
 * {@link VaultRecoveryService.scan}. Never mutates the vault or uploads anything.
 */
onMessage('scanVaultRecovery', async (message) => {
    let report: ScanReportInterface | null = null;

    try {
        const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
        if (!backendPassmanClient) {
            return { status: false, errorMessage: i18n.getMessage('could_not_get_passman_client'), report };
        }

        const defaultVaultInfo = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo);
        if (!defaultVaultInfo) {
            return { status: false, errorMessage: i18n.getMessage('no_vault_info_in_extension_settings'), report };
        }

        const vault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, false);
        if (!vault) {
            return { status: false, errorMessage: i18n.getMessage('could_not_get_selected_vault_by_guid'), report };
        }
        // Force a fresh, un-cached credential list; do not rely on vaultKey being valid.
        await vault.refresh(false);

        report = await VaultRecoveryService.scan(vault, message.data.candidates);
        return { status: true, errorMessage: null, report };
    } catch (exception) {
        logger.error('[scanVaultRecovery]', exception);
        return { status: false, errorMessage: i18n.getMessage('vault_recovery_scan_failed'), report };
    }
});
