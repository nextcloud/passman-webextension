<script lang="ts">
    import { onMount } from "svelte";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import Card from "~/spa_partials/Card.svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import ShowGenericErrors from "~/spa_partials/FormElements/ShowGenericErrors.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import keyIcon from "svelte-awesome/icons/key";
    import plusIcon from "svelte-awesome/icons/plus";
    import trashIcon from "svelte-awesome/icons/trash";
    import exclamationTriangle from "svelte-awesome/icons/exclamationTriangle";
    import checkCircle from "svelte-awesome/icons/checkCircle";
    import cloud from "svelte-awesome/icons/cloud";
    import download from "svelte-awesome/icons/download";
    import { i18n } from "~/lib/i18n";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import NotyService from "~/services/frontend/NotyService";
    import { logger } from "~/services/ConsoleLoggingService";
    import type { RepairVaultRecoveryResponse } from "@/entrypoints/background/messages/repairVaultRecovery";
    import type {
        CredentialRecoveryStatus
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/CredentialRecoveryStatus";
    import type {
        CredentialRecoveryKind
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/CredentialRecoveryKind";
    import type { RepairStrategyType } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/RepairStrategyType";
    import type { ScanReportInterface } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/ScanReportInterface";
    import type {
        VaultRecoveryRepairResultInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryRepairResultInterface";
    import type {
        VaultRecoveryRepairItemResultInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryRepairItemResultInterface";
    import type {
        VaultKeyCandidateInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultKeyCandidateInterface";
    import type {
        VaultRecoveryDestination
    } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryDestination";
    import type { FileRecoveryHitInterface } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/FileRecoveryHitInterface";
    import { DownloadService } from "@binsky/passman-client-ts/lib/Service/DownloadService";

    /** Fixed id of the migration target candidate; matches the candidate list built by {@link buildCandidates}. */
    const PREFERRED_ID = 'preferred';
    /** Hits with these statuses have a suggested repair strategy and can be selected for repair. */
    const ACTIONABLE_STATUSES = new Set<CredentialRecoveryStatus>(['needs_rewrap', 'shared_key_mismatch', 'partially_broken']);

    type AlternateCandidate = { id: string, password: string };

    let pageIsLoading = $state(true);
    let guardErrorMessage = $state<string | null>(null);

    let preferredPassword = $state('');
    let alternateCandidates = $state<AlternateCandidate[]>([{ id: 'old-1', password: '' }]);
    let nextAlternateIndex = 2;
    let skipDeleted = $state(true);

    let formErrors = $state<string[]>([]);
    let scanning = $state(false);
    let repairing = $state(false);
    let report = $state<ScanReportInterface | null>(null);
    let selectedGuids = $state<Set<string>>(new Set());
    /** Per-guid preview of what the (destination-agnostic) in-place strategy would do; from the last dry run. */
    let dryRunRepairByGuid = $state<Record<string, VaultRecoveryRepairItemResultInterface>>({});
    let repairResult = $state<VaultRecoveryRepairResultInterface | null>(null);
    let defaultVaultPasswordUpdated = $state(false);
    /** Fingerprint of the config a dry run last validated; `null` whenever Apply must not be trusted yet. */
    let lastDryRunFingerprint = $state<string | null>(null);

    let destination = $state<VaultRecoveryDestination>('new_vault');
    let newVaultName = $state('');
    let includeHealthy = $state(true);

    const busy = $derived(scanning || repairing);
    /** Changes whenever anything that would change a dry run's outcome changes. */
    const configFingerprint = $derived(JSON.stringify({
        preferred: preferredPassword,
        alts: alternateCandidates.map((candidate) => candidate.password),
        skipDeleted
    }));
    const dryRunIsCurrent = $derived(lastDryRunFingerprint !== null && lastDryRunFingerprint === configFingerprint);

    const actionableHits = $derived((report?.hits ?? []).filter((hit) => ACTIONABLE_STATUSES.has(hit.status)));
    const visibleHits = $derived((report?.hits ?? []).filter((hit) => hit.status !== 'skipped'));
    const allSelected = $derived(
        actionableHits.length > 0 && actionableHits.every((hit) => selectedGuids.has(hit.guid))
    );
    /** 'ok' hits are never in `selectedGuids`; `includeHealthy` alone controls whether they are copied. */
    const healthyGuids = $derived(
        (report?.hits ?? [])
            .filter((hit) => hit.status === 'ok' && hit.kind !== 'shared_with_us')
            .map((hit) => hit.guid)
    );
    const copyHasContent = $derived(selectedGuids.size > 0 || (includeHealthy && healthyGuids.length > 0));
    /** Mirrors passman-svelte's `applyEnabled`: Apply is never reachable without a dry run matching the current config. */
    const repairEnabled = $derived(!busy && dryRunIsCurrent && (
        destination === 'in_place'
            ? selectedGuids.size > 0
            : destination === 'new_vault'
                ? copyHasContent && newVaultName.trim() !== ''
                : copyHasContent
    ));
    const repairButtonLabel = $derived(
        destination === 'new_vault'
            ? i18n.getMessage('vault_recovery_create_vault_button')
            : destination === 'passman_json'
                ? i18n.getMessage('vault_recovery_download_json_button')
                : i18n.getMessage('vault_recovery_repair_button')
    );
    const writeWarningText = $derived(
        destination === 'new_vault'
            ? i18n.getMessage('vault_recovery_write_warning_new_vault')
            : destination === 'passman_json'
                ? i18n.getMessage('vault_recovery_write_warning_json')
                : i18n.getMessage('vault_recovery_write_warning')
    );
    /** 'in_place' has nothing to apply without an actionable hit; the copy destinations can still export/copy an all-healthy vault. */
    const showApplySection = $derived(destination === 'in_place' ? actionableHits.length > 0 : visibleHits.length > 0);

    const addAlternateCandidate = () => {
        alternateCandidates = [...alternateCandidates, { id: `old-${nextAlternateIndex++}`, password: '' }];
    };

    const removeAlternateCandidate = (id: string) => {
        alternateCandidates = alternateCandidates.filter((candidate) => candidate.id !== id);
    };

    const buildCandidates = (): VaultKeyCandidateInterface[] => [
        { id: PREFERRED_ID, password: preferredPassword, preferred: true },
        ...alternateCandidates
            .filter((candidate) => candidate.password.trim() !== '')
            .map((candidate) => ({ id: candidate.id, password: candidate.password })),
    ];

    const initializeSelection = (nextReport: ScanReportInterface) => {
        // shared_with_us defaults to unselected: including it means copying it as a new owned credential into
        // the destination, which is an opt-in action, not a default one.
        const next = new Set<string>();
        for (const hit of nextReport.hits) {
            if (ACTIONABLE_STATUSES.has(hit.status) && hit.kind !== 'shared_with_us') {
                next.add(hit.guid);
            }
        }
        selectedGuids = next;
    };

    const toggleSelectAll = () => {
        selectedGuids = allSelected ? new Set() : new Set(actionableHits.map((hit) => hit.guid));
    };

    const toggleHitSelection = (guid: string) => {
        const next = new Set(selectedGuids);
        if (next.has(guid)) {
            next.delete(guid);
        } else {
            next.add(guid);
        }
        selectedGuids = next;
    };

    /**
     * Dry run: validates decrypt feasibility and previews the in-place repair outcome via
     * {@link VaultRecoveryService.repair}'s `dryRun: true` path, exactly like passman-svelte's "Dry run" button.
     * No `destination` is sent. It always defaults to `in_place` server-side, since every destination relies
     * on the same underlying scan + decrypt step, and this is cheaper than calling `scan()` separately.
     * (that would re-run the file-blob HTTP probes a second time for nothing)
     */
    const scan = async () => {
        formErrors = [];
        if (preferredPassword === '') {
            formErrors = [i18n.getMessage('vault_recovery_preferred_password_required')];
            return;
        }
        if (busy) {
            return;
        }

        scanning = true;
        repairResult = null;
        defaultVaultPasswordUpdated = false;
        dryRunRepairByGuid = {};
        lastDryRunFingerprint = null;

        const fingerprint = configFingerprint;
        try {
            const response: RepairVaultRecoveryResponse = await sendMessage('repairVaultRecovery', {
                preferredKeyId: PREFERRED_ID,
                candidates: buildCandidates(),
                dryRun: true,
                skipDeleted,
            });

            if (response.status && response.result?.report) {
                report = response.result.report;
                initializeSelection(response.result.report);

                const byGuid: Record<string, VaultRecoveryRepairItemResultInterface> = {};
                for (const item of response.result.items) {
                    byGuid[item.guid] = item;
                }
                dryRunRepairByGuid = byGuid;
                lastDryRunFingerprint = fingerprint;
            } else {
                report = null;
                selectedGuids = new Set();
                NotyService.notyError(response.errorMessage ?? i18n.getMessage('vault_recovery_scan_failed'));
            }
        } catch (exception) {
            logger.error('[VaultRecovery] scan', exception);
            report = null;
            selectedGuids = new Set();
            NotyService.notyError(i18n.getMessage('vault_recovery_scan_failed'));
        } finally {
            scanning = false;
        }
    };

    // For 'in_place', repair only ever touches the user's selection.
    // For the copy destinations, already-healthy credentials are controlled solely by `includeHealthy`
    // (not the selection list, which never contains 'ok' hits). So they have to be added to the explicit guid list here,
    // otherwise VaultRecoveryService.repair would treat an explicit credentialGuids list as a hard restriction
    // and drop them regardless of includeHealthy.
    // shared_with_us is excluded from that auto-add: it is only ever copied when explicitly selected, healthy or not.
    const credentialGuidsForDestination = (): string[] =>
        destination === 'in_place' ? Array.from(selectedGuids) : [...selectedGuids, ...healthyGuids];

    const confirmForDestination = (): boolean => {
        if (destination === 'new_vault') {
            return confirm(i18n.getMessage('vault_recovery_repair_confirm_new_vault', [newVaultName.trim()]));
        }
        if (destination === 'in_place') {
            return confirm(i18n.getMessage('vault_recovery_repair_confirm'));
        }
        return true; // passman_json only reads and builds a string in memory, nothing to confirm
    };

    const downloadPassmanJsonResult = (result: VaultRecoveryRepairResultInterface) => {
        if (result.json) {
            DownloadService.download(result.json, 'passman-recovery-export.json', 'application/json');
        }
    };

    const redownloadPassmanJsonResult = () => {
        if (repairResult) {
            downloadPassmanJsonResult(repairResult);
        }
    };

    /**
     * Apply: the real action, always `dryRun: false`. Only reachable via {@link repairEnabled}, which
     * requires {@link dryRunIsCurrent}. A stale report (from before a password/skipDeleted edit) can
     * never be applied without pressing "Scan vault" again first, mirroring passman-svelte's `applyEnabled`.
     */
    const repair = async () => {
        if (!repairEnabled) {
            return;
        }
        if (!confirmForDestination()) {
            return;
        }

        repairing = true;
        repairResult = null;
        try {
            const response: RepairVaultRecoveryResponse = await sendMessage('repairVaultRecovery', {
                preferredKeyId: PREFERRED_ID,
                candidates: buildCandidates(),
                credentialGuids: credentialGuidsForDestination(),
                dryRun: false,
                skipDeleted,
                destination,
                newVaultName: destination === 'new_vault' ? newVaultName.trim() : undefined,
                includeHealthy: destination === 'in_place' ? undefined : includeHealthy,
            });

            if (response.status && response.result) {
                repairResult = response.result;
                defaultVaultPasswordUpdated = response.defaultVaultPasswordUpdated;
                // Force a fresh dry run before anything can be applied again:
                // the original vault (in_place) or the selection's relevance (new_vault/passman_json) may
                // no longer match what was just scanned.
                lastDryRunFingerprint = null;

                if (response.result.failed === 0) {
                    NotyService.notySuccess(i18n.getMessage('vault_recovery_repair_succeeded'));
                } else {
                    NotyService.notyWarning(i18n.getMessage('vault_recovery_repair_partial'));
                }

                if (destination === 'passman_json') {
                    downloadPassmanJsonResult(response.result);
                }
            } else {
                NotyService.notyError(response.errorMessage ?? i18n.getMessage('vault_recovery_repair_failed'));
            }
        } catch (exception) {
            logger.error('[VaultRecovery] repair', exception);
            NotyService.notyError(i18n.getMessage('vault_recovery_repair_failed'));
        } finally {
            repairing = false;
        }
    };

    const statusLabel = (status: CredentialRecoveryStatus): string => {
        switch (status) {
            case 'ok':
                return i18n.getMessage('vault_recovery_status_ok');
            case 'needs_rewrap':
                return i18n.getMessage('vault_recovery_status_needs_rewrap');
            case 'shared_key_mismatch':
                return i18n.getMessage('vault_recovery_status_shared_key_mismatch');
            case 'partially_broken':
                return i18n.getMessage('vault_recovery_status_partially_broken');
            case 'broken':
                return i18n.getMessage('vault_recovery_status_broken');
            case 'skipped':
                return i18n.getMessage('vault_recovery_status_skipped');
        }
    };

    const kindLabel = (kind: CredentialRecoveryKind): string => {
        switch (kind) {
            case 'owned':
                return i18n.getMessage('vault_recovery_kind_owned');
            case 'shared_by_us':
                return i18n.getMessage('vault_recovery_kind_shared_by_us');
            case 'shared_with_us':
                return i18n.getMessage('vault_recovery_kind_shared_with_us');
        }
    };

    const strategyLabel = (strategy: RepairStrategyType | undefined): string | null => {
        switch (strategy) {
            case 'rewrap_owned':
                return i18n.getMessage('vault_recovery_strategy_rewrap_owned');
            case 'rewrap_shared_by_us_wrapper':
                return i18n.getMessage('vault_recovery_strategy_rewrap_shared_by_us_wrapper');
            case 'fix_shared_key_mismatch':
                return i18n.getMessage('vault_recovery_strategy_fix_shared_key_mismatch');
            case 'rewrap_acl_shared_with_us':
                return i18n.getMessage('vault_recovery_strategy_rewrap_acl_shared_with_us');
            default:
                return null;
        }
    };

    const fileHitStatusLabel = (status: FileRecoveryHitInterface['status']): string => {
        switch (status) {
            case 'ok':
                return i18n.getMessage('vault_recovery_file_status_ok');
            case 'needs_rewrap':
                return i18n.getMessage('vault_recovery_file_status_needs_rewrap');
            case 'broken':
                return i18n.getMessage('vault_recovery_file_status_broken');
        }
    };

    const fileHitBadgeClasses = (status: FileRecoveryHitInterface['status']): string => {
        switch (status) {
            case 'ok':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
            case 'needs_rewrap':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
            case 'broken':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
        }
    };

    const statusBadgeClasses = (status: CredentialRecoveryStatus): string => {
        switch (status) {
            case 'ok':
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
            case 'needs_rewrap':
            case 'shared_key_mismatch':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
            case 'partially_broken':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
            case 'broken':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const repairItemForGuid = (guid: string) => repairResult?.items.find((item) => item.guid === guid) ?? null;

    onMount(() => {
        ExtensionUnlockService.isSetupDone().then(async (isSetupDone) => {
            if (!isSetupDone) {
                push('/setup/server');
                return;
            }
            if (!await ExtensionUnlockService.isUnlocked()) {
                push('/unlock');
                return;
            }

            const defaultVaultInfo = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo);
            if (!defaultVaultInfo) {
                guardErrorMessage = i18n.getMessage('no_default_vault_info_found');
            } else {
                preferredPassword = defaultVaultInfo.password;
                newVaultName = `${defaultVaultInfo.name} (recovered)`;
            }
            pageIsLoading = false;
        });
    });
</script>

{#if pageIsLoading}
    <Loading/>
{:else if guardErrorMessage}
    <Card additionalClasses="text-left mb-6 w-full">
        <p class="text-red-600">{guardErrorMessage}</p>
    </Card>
{:else}
    <div class="w-full space-y-4 text-left">
        <div>
            <h2 class="text-xl font-semibold">{i18n.getMessage('vault_recovery')}</h2>
            <p class="text-sm text-gray-500 mt-1">{i18n.getMessage('vault_recovery_description')}</p>
        </div>

        <Card additionalClasses="w-full space-y-3">
            <div class="flex items-center gap-2">
                <Icon data={keyIcon} scale={1.0}/>
                <h3 class="text-md font-semibold">{i18n.getMessage('vault_recovery_keys_section')}</h3>
            </div>

            <CustomInputField
                id="vaultRecoveryPreferredPassword"
                label={i18n.getMessage('vault_recovery_preferred_password_label')}
                bind:value={preferredPassword}
                type="password"
            />
            <p class="text-xs text-gray-500">{i18n.getMessage('vault_recovery_preferred_password_hint')}</p>

            <div class="space-y-2">
                <span class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block">
                    {i18n.getMessage('vault_recovery_alternate_passwords_label')}
                </span>
                {#each alternateCandidates as candidate (candidate.id)}
                    <div class="flex items-end gap-2">
                        <div class="flex-1">
                            <CustomInputField
                                id={`vaultRecoveryAltPassword-${candidate.id}`}
                                bind:value={candidate.password}
                                type="password"
                            />
                        </div>
                        <button
                            type="button"
                            class="text-red-500 hover:text-red-700 px-2 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={i18n.getMessage('vault_recovery_remove_alternate_password')}
                            onclick={() => removeAlternateCandidate(candidate.id)}
                            disabled={alternateCandidates.length <= 1}
                        >
                            <Icon data={trashIcon} scale={1.0}/>
                        </button>
                    </div>
                {/each}
                <OnClickButton callback={addAlternateCandidate} small={true}>
                    <Icon data={plusIcon} scale={0.9}/>
                    {i18n.getMessage('vault_recovery_add_alternate_password')}
                </OnClickButton>
            </div>

            <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={skipDeleted} onchange={() => skipDeleted = !skipDeleted}/>
                    {i18n.getMessage('vault_recovery_skip_deleted')}
                </label>
            </div>

            <ShowGenericErrors bind:errors={formErrors}/>

            <OnClickButton callback={scan} disabled={busy}>
                {#if scanning}
                    <Icon data={refresh} scale={1.2} spin={true}/>
                {:else}
                    {i18n.getMessage('vault_recovery_scan_button')}
                {/if}
            </OnClickButton>
        </Card>

        {#if report}
            <Card additionalClasses="w-full space-y-3 {!dryRunIsCurrent ? 'opacity-60' : ''}">
                <h3 class="text-md font-semibold">{i18n.getMessage('vault_recovery_scan_results_section')}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    {i18n.getMessage('vault_recovery_scan_summary', [
                        String(report.okCount ?? 0),
                        String((report.needsRewrapCount ?? 0) + (report.sharedKeyMismatchCount ?? 0) + (report.partiallyBrokenCount ?? 0)),
                        String(report.brokenCount ?? 0),
                        String(report.skippedCount ?? 0),
                    ])}
                </p>

                {#if !dryRunIsCurrent}
                    <p class="text-sm text-amber-700 dark:text-amber-300">{i18n.getMessage('vault_recovery_config_changed_hint')}</p>
                {/if}

                {#if report.brokenCount > 0}
                    <div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100 flex gap-2 items-start">
                        <span class="shrink-0 mt-0.5"><Icon data={exclamationTriangle} scale={1.0}/></span>
                        <span>{i18n.getMessage('vault_recovery_broken_hint')}</span>
                    </div>
                {/if}

                {#if visibleHits.length === 0}
                    <p class="text-sm text-gray-500">{i18n.getMessage('no_matching_credentials')}</p>
                {:else}
                    {#if actionableHits.length > 0}
                        <div class="flex items-center justify-between gap-2">
                            <label class="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} disabled={!dryRunIsCurrent}/>
                                {i18n.getMessage('vault_recovery_select_all')}
                            </label>
                            <span class="text-xs text-gray-500 shrink-0">
                                {i18n.getMessage('vault_recovery_selected_count', [
                                    String(selectedGuids.size),
                                    String(actionableHits.length),
                                ])}
                            </span>
                        </div>
                    {/if}

                    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {#each visibleHits as hit (hit.guid)}
                            {@const dryRunItem = dryRunRepairByGuid[hit.guid]}
                            {@const repairItem = repairItemForGuid(hit.guid)}
                            <div class="border border-gray-200 dark:border-gray-600 rounded-md p-2">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-start gap-2 min-w-0">
                                        {#if ACTIONABLE_STATUSES.has(hit.status)}
                                            <input
                                                type="checkbox"
                                                class="mt-1 shrink-0"
                                                checked={selectedGuids.has(hit.guid)}
                                                onchange={() => toggleHitSelection(hit.guid)}
                                                disabled={!dryRunIsCurrent}
                                            />
                                        {/if}
                                        <div class="min-w-0">
                                            <p class="truncate font-medium">{hit.label}</p>
                                            <p class="text-xs text-gray-500">{kindLabel(hit.kind)}</p>
                                        </div>
                                    </div>
                                    <span class="shrink-0 text-xs px-2 py-1 rounded-full {statusBadgeClasses(hit.status)}">
                                        {statusLabel(hit.status)}
                                    </span>
                                </div>
                                {#if strategyLabel(hit.suggestedStrategy)}
                                    <p class="text-xs text-gray-500 mt-1">{strategyLabel(hit.suggestedStrategy)}</p>
                                {/if}
                                {#if hit.kind === 'shared_with_us' && destination !== 'in_place'}
                                    <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">{i18n.getMessage('vault_recovery_shared_with_us_hint')}</p>
                                {/if}
                                {#if hit.status === 'broken' && (hit.brokenFields?.length ?? 0) > 0}
                                    <p class="text-xs text-red-500 mt-1">{hit.brokenFields.join(', ')}</p>
                                {/if}
                                {#if (hit.fileHits?.length ?? 0) > 0}
                                    <div class="mt-2 space-y-1">
                                        {#each hit.fileHits ?? [] as fileHit}
                                            <div class="flex items-center justify-between gap-2 text-xs">
                                                <span class="truncate text-gray-500">{fileHit.filename}</span>
                                                <span class="shrink-0 px-2 py-0.5 rounded-full {fileHitBadgeClasses(fileHit.status)}">
                                                    {fileHitStatusLabel(fileHit.status)}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                                {#if dryRunItem && !dryRunItem.success}
                                    <p class="text-xs mt-1 text-red-600 flex items-center gap-1">
                                        <Icon data={exclamationTriangle} scale={0.9}/>
                                        {i18n.getMessage('vault_recovery_dry_run_item_failed', [dryRunItem.error ?? ''])}
                                    </p>
                                {/if}
                                {#if repairItem}
                                    <p class="text-xs mt-1 flex items-center gap-1 {repairItem.success ? 'text-green-600' : 'text-red-600'}">
                                        {#if repairItem.success}
                                            <Icon data={checkCircle} scale={0.9}/>
                                            {i18n.getMessage('vault_recovery_repair_item_success')}
                                        {:else}
                                            <Icon data={exclamationTriangle} scale={0.9}/>
                                            {i18n.getMessage('vault_recovery_repair_item_failed', [repairItem.error ?? ''])}
                                        {/if}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if showApplySection}
                    <div class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div class="flex items-center gap-2">
                            <Icon data={cloud} scale={1.0}/>
                            <h4 class="text-sm font-semibold">{i18n.getMessage('vault_recovery_destination_section')}</h4>
                        </div>

                        <div class="space-y-2">
                            <label class="flex items-start gap-2 text-sm cursor-pointer">
                                <input type="radio" name="vaultRecoveryDestination" value="new_vault" bind:group={destination} class="mt-1"/>
                                <span>
                                    <span class="font-medium">{i18n.getMessage('vault_recovery_destination_new_vault_label')}</span>
                                    <span class="block text-xs text-gray-500">{i18n.getMessage('vault_recovery_destination_new_vault_hint')}</span>
                                </span>
                            </label>
                            <label class="flex items-start gap-2 text-sm cursor-pointer">
                                <input type="radio" name="vaultRecoveryDestination" value="passman_json" bind:group={destination} class="mt-1"/>
                                <span>
                                    <span class="font-medium">{i18n.getMessage('vault_recovery_destination_json_label')}</span>
                                    <span class="block text-xs text-gray-500">{i18n.getMessage('vault_recovery_destination_json_hint')}</span>
                                </span>
                            </label>
                            <label class="flex items-start gap-2 text-sm cursor-pointer">
                                <input type="radio" name="vaultRecoveryDestination" value="in_place" bind:group={destination} class="mt-1"/>
                                <span>
                                    <span class="font-medium">{i18n.getMessage('vault_recovery_destination_in_place_label')}</span>
                                    <span class="block text-xs text-gray-500">{i18n.getMessage('vault_recovery_destination_in_place_hint')}</span>
                                </span>
                            </label>
                        </div>

                        {#if destination === 'new_vault'}
                            <CustomInputField
                                id="vaultRecoveryNewVaultName"
                                label={i18n.getMessage('vault_recovery_new_vault_name_label')}
                                bind:value={newVaultName}
                            />
                            {#if newVaultName.trim() === ''}
                                <p class="text-xs text-red-600">{i18n.getMessage('vault_recovery_new_vault_name_required')}</p>
                            {/if}
                        {/if}

                        {#if destination !== 'in_place'}
                            <CustomCheckboxField
                                id="vaultRecoveryIncludeHealthy"
                                bind:value={includeHealthy}
                                label={i18n.getMessage('vault_recovery_include_healthy_label')}
                            />
                            <p class="text-xs text-gray-500">{i18n.getMessage('vault_recovery_include_healthy_hint')}</p>
                        {/if}

                        <div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                            {writeWarningText}
                        </div>

                        {#if !dryRunIsCurrent}
                            <p class="text-sm text-gray-500">{i18n.getMessage('vault_recovery_apply_disabled_hint')}</p>
                        {/if}

                        <OnClickButton callback={repair} disabled={!repairEnabled}>
                            {#if repairing}
                                <Icon data={refresh} scale={1.2} spin={true}/>
                            {:else if destination === 'passman_json'}
                                <Icon data={download} scale={1.0}/>
                            {/if}
                            {repairButtonLabel}
                        </OnClickButton>
                    </div>
                {/if}
            </Card>
        {/if}

        {#if repairResult}
            <Card additionalClasses="w-full space-y-2">
                <h3 class="text-md font-semibold">{i18n.getMessage('vault_recovery_done_section')}</h3>
                <p class="text-sm">
                    {i18n.getMessage('vault_recovery_repair_summary', [
                        String(repairResult.succeeded),
                        String(repairResult.failed),
                    ])}
                </p>
                {#if defaultVaultPasswordUpdated}
                    <p class="text-sm text-green-600">{i18n.getMessage('vault_recovery_preferred_password_updated')}</p>
                {/if}
                {#if repairResult.destination === 'new_vault' && repairResult.createdVaultGuid}
                    <p class="text-sm text-green-700 dark:text-green-300">
                        {i18n.getMessage('vault_recovery_created_vault_success', [repairResult.createdVaultName ?? ''])}
                    </p>
                {/if}
                {#if repairResult.destination === 'passman_json' && repairResult.json}
                    <p class="text-sm text-green-700 dark:text-green-300">{i18n.getMessage('vault_recovery_json_downloaded_hint')}</p>
                    <OnClickButton callback={redownloadPassmanJsonResult}>
                        <Icon data={download} scale={1.0}/>
                        {i18n.getMessage('vault_recovery_download_json_button')}
                    </OnClickButton>
                {/if}
                {#if repairResult.destination === 'in_place'}
                    <p class="text-xs text-gray-500">{i18n.getMessage('vault_recovery_config_changed_hint')}</p>
                {/if}
                {#if report && report.brokenCount > 0}
                    <p class="text-xs text-gray-500">{i18n.getMessage('vault_recovery_broken_hint')}</p>
                {/if}
            </Card>
        {/if}

        <InternalHrefLinkButton href="/home" title={i18n.getMessage('vault_recovery_back_home')}>
            {i18n.getMessage('vault_recovery_back_home')}
        </InternalHrefLinkButton>
    </div>
{/if}
