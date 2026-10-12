import PassmanClientService from "~/services/PassmanClientService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import ServerConnectionDirectoryService from "~/services/ServerConnectionDirectoryService";
import { VaultRecoveryService } from "@binsky/passman-client-ts/lib/Service/VaultRecovery/VaultRecoveryService";
import type {
    VaultKeyCandidateInterface
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultKeyCandidateInterface";
import type {
    VaultRecoveryRepairResultInterface
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryRepairResultInterface";
import type {
    VaultRecoveryDestination
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryDestination";
import { onMessage, sendMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";
import type { VaultRecoveryProgressInterface } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryProgressInterface";
import EncryptionErrorSkippedCredentialStore from "~/services/EncryptionErrorSkippedCredentialStore";

export interface RepairVaultRecoveryRequest {
    preferredKeyId: string;
    candidates: VaultKeyCandidateInterface[];
    /** Restrict repair to these credential guids. Default: all credentials with status 'needs_rewrap' or 'shared_key_mismatch'. */
    credentialGuids?: string[];
    dryRun: boolean;
    /** Where to write recovered credentials. Default 'in_place'. */
    destination?: VaultRecoveryDestination;
    /** Name of the vault to create. Required for destination: 'new_vault'. */
    newVaultName?: string;
    /** Also materialize/copy already-healthy ('ok') credentials. Only relevant for 'new_vault' / 'passman_json'. */
    includeHealthy?: boolean;
    /** Forwarded to the internal scan. Default true. */
    skipDeleted?: boolean;
}

export interface RepairVaultRecoveryResponse {
    status: boolean;
    errorMessage: string | null;
    result: VaultRecoveryRepairResultInterface | null;
    /** True if the stored default vault password was migrated to the preferred candidate's password after a successful repair. */
    defaultVaultPasswordUpdated: boolean;
}

/**
 * Applies {@link VaultRecoveryService.repair} against the default vault (loaded fresh, no cache), then, on a
 * successful non-dry-run repair, migrates the stored default vault password to the preferred candidate's
 * password if it differs and the preferred candidate is verified to actually unlock the vault.
 */
onMessage('repairVaultRecovery', async (message) => {
    let result: VaultRecoveryRepairResultInterface | null = null;
    let defaultVaultPasswordUpdated = false;

    try {
        const backendPassmanClient = await PassmanClientService.getBackendPassmanClient();
        if (!backendPassmanClient) {
            return { status: false, errorMessage: i18n.getMessage('could_not_get_passman_client'), result, defaultVaultPasswordUpdated };
        }

        const defaultVaultInfo = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo);
        if (!defaultVaultInfo) {
            return { status: false, errorMessage: i18n.getMessage('no_vault_info_in_extension_settings'), result, defaultVaultPasswordUpdated };
        }

        // Uncached fetch of the full vault may take a while for a large vault and happens before
        // VaultRecoveryService ever gets to report its own 'credentials' stage.
        // Without this, the page would show nothing / a generic fallback for however long this fetch takes.
        sendMessage('vaultRecoveryProgress', { stage: 'loading', doneSteps: 0, totalSteps: 0 }).catch(() => {
        });

        const vault = await backendPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, false);
        if (!vault) {
            return { status: false, errorMessage: i18n.getMessage('could_not_get_selected_vault_by_guid'), result, defaultVaultPasswordUpdated };
        }
        await vault.refresh(false);

        const { preferredKeyId, candidates, credentialGuids, dryRun, destination, newVaultName, includeHealthy, skipDeleted } = message.data;
        if (!dryRun) {
            try {
                await EncryptionErrorSkippedCredentialStore.clear(defaultVaultInfo.guid);
            } catch (exception) {
                logger.error('[repairVaultRecovery] failed to clear skipped encryption errors', exception);
            }
        }
        result = await VaultRecoveryService.repair(vault, {
            preferredKeyId,
            candidates,
            credentialGuids,
            dryRun,
            destination,
            newVaultName,
            includeHealthy,
            skipDeleted,
            onProgress: (state: VaultRecoveryProgressInterface) => {
                // Fire-and-forget push to whatever vault recovery page is open;
                // a closed/absent page (no receiving end) must never fail or slow down the scan / repair itself.
                sendMessage('vaultRecoveryProgress', {
                    stage: state.stage,
                    doneSteps: state.doneSteps,
                    totalSteps: state.totalSteps
                }).catch(() => {
                });
            },
            onError: (errorMessage) => logger.error('[repairVaultRecovery]', errorMessage),
        });

        // Only the in-place destination rewraps credentials still on the current default vault;
        // the copy destinations leave the original vault (and therefore its stored password) untouched.
        if (!dryRun && result.succeeded > 0 && (destination ?? 'in_place') === 'in_place') {
            const preferredCandidate = candidates.find((candidate) => candidate.id === preferredKeyId);
            if (
                preferredCandidate
                && preferredCandidate.password !== defaultVaultInfo.password
                && vault.testVaultKey(preferredCandidate.password)
            ) {
                await ServerConnectionDirectoryService.setDefaultVaultForActiveConnection({
                    guid: defaultVaultInfo.guid,
                    name: vault.name,
                    password: preferredCandidate.password
                });
                defaultVaultPasswordUpdated = true;
            }
        }

        return { status: true, errorMessage: null, result, defaultVaultPasswordUpdated };
    } catch (exception) {
        logger.error('[repairVaultRecovery]', exception);
        return { status: false, errorMessage: i18n.getMessage('vault_recovery_repair_failed'), result, defaultVaultPasswordUpdated };
    }
});
