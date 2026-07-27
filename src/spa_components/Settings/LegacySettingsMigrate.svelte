<script lang="ts">
    import { onMount } from "svelte";
    import Select from "svelte-select";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Card from "~/spa_partials/Card.svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import LegacySettingsMigrationService, {
        LegacySettingsMigrationError,
    } from "~/services/LegacySettingsMigrationService";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import extensionUnlockStateStore, { ExtensionUnlockState } from '~/stores/extensionUnlockStateStore';
    import {
        type DefaultVaultInfo,
        type ExtensionSettings,
        ExtensionSettingsOptions,
    } from "~/services/ExtensionSettingsService";
    import { PassmanServerConnection } from "@binsky/passman-client-ts/lib/Model/PassmanServerConnection";
    import type {
        NextcloudServerInfoInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import NotyService from "~/services/frontend/NotyService";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { i18n } from "~/lib/i18n";
    import passmanImage from "~/assets/images/passman.svg";

    type ProbeStatus = "idle" | "checking" | "ok" | "error";

    type VaultOption = { guid: string; name: string };

    type EditableConnection = {
        key: string;
        baseUrl: string;
        user: string;
        token: string;
        backendAppId?: NextcloudServerInfoInterface["backendAppId"];
        vaultGuid: string;
        vaultName: string;
        vaultPassword: string;
        connectionStatus: ProbeStatus;
        vaultStatus: ProbeStatus;
        statusMessage: string;
        vaultSelectionList: VaultOption[];
        selectedVaultInfo: VaultOption | null;
    };

    let masterPassword = $state("");
    let unlockStep = $state(true);
    let unlockError = $state("");
    let unlocking = $state(false);
    let committing = $state(false);
    let commitError = $state("");
    let probingAll = $state(false);

    let unlockedMasterPassword = $state("");
    let connections = $state<EditableConnection[]>([]);
    let activeKey = $state("");

    let ignoreProtocol = $state(false);
    let ignoreSubdomain = $state(false);
    let ignorePath = $state(true);
    let ignorePort = $state(false);
    let autofillEnabled = $state(false);
    let generatedPasswordLength = $state("12");
    let ignoredSitesText = $state("");

    let baseExtensionSettings = $state<ExtensionSettings | null>(null);

    onMount(() => {
        LegacySettingsMigrationService.hasLegacyData().then(async (hasLegacy) => {
            if (!hasLegacy) {
                push("/setup/start/0");
                return;
            }
            masterPassword =
                (await LegacySettingsMigrationService.peekRememberedMasterPassword()) ?? "";
        });
    });

    function connectionIdOf(conn: EditableConnection): string {
        return PassmanServerConnection.buildConnectionId({
            baseUrl: conn.baseUrl.replace(/\/$/, ""),
            user: conn.user,
            token: conn.token,
            persistence: "",
            backendAppId: conn.backendAppId,
        });
    }

    function vaultListKey(conn: EditableConnection): string {
        return conn.vaultSelectionList.map((v) => v.guid).join("|");
    }

    function applyPreview(settings: ExtensionSettings, activeConnectionId: string) {
        baseExtensionSettings = structuredClone(settings);
        const list = settings[ExtensionSettingsOptions.nextcloudServerConnections] ?? [];
        const vaults = settings[ExtensionSettingsOptions.defaultVaultInfoByConnection] ?? {};

        connections = list.map((server, index) => {
            const id = PassmanServerConnection.buildConnectionId(server);
            const vault = vaults[id];
            const key = `c-${index}-${id}`;
            const vaultOption: VaultOption | null = vault?.guid
                ? { guid: vault.guid, name: vault.name || vault.guid }
                : null;
            return {
                key,
                baseUrl: server.baseUrl,
                user: server.user,
                token: server.token,
                backendAppId: server.backendAppId,
                vaultGuid: vault?.guid ?? "",
                vaultName: vault?.name ?? "",
                vaultPassword: vault?.password ?? "",
                connectionStatus: "idle" as ProbeStatus,
                vaultStatus: "idle" as ProbeStatus,
                statusMessage: "",
                vaultSelectionList: vaultOption ? [vaultOption] : [],
                selectedVaultInfo: vaultOption,
            };
        });

        const activeIndex = list.findIndex(
            (c) => PassmanServerConnection.buildConnectionId(c) === activeConnectionId
        );
        activeKey = connections[activeIndex >= 0 ? activeIndex : 0]?.key ?? "";

        ignoreProtocol = settings[ExtensionSettingsOptions.ignoreProtocol] ?? false;
        ignoreSubdomain = settings[ExtensionSettingsOptions.ignoreSubdomain] ?? false;
        ignorePath = settings[ExtensionSettingsOptions.ignorePath] ?? true;
        ignorePort = settings[ExtensionSettingsOptions.ignorePort] ?? false;
        autofillEnabled = settings[ExtensionSettingsOptions.autofillEnabled] ?? false;
        generatedPasswordLength = String(
            settings[ExtensionSettingsOptions.passwordGeneratorConfiguration]?.length ?? 12
        );
        ignoredSitesText = LegacySettingsMigrationService.pageRulesToIgnoredSitesList(
            settings[ExtensionSettingsOptions.pageRules]
        ).join("\n");
    }

    async function unlockLegacy() {
        unlockError = "";
        unlocking = true;
        try {
            const preview = await LegacySettingsMigrationService.previewFromLegacy(masterPassword);
            unlockedMasterPassword = preview.masterPassword;
            applyPreview(preview.extensionSettings, preview.activeConnectionId);
            unlockStep = false;
            await probeAllConnections();
        } catch (e) {
            if (e instanceof LegacySettingsMigrationError && e.code === "invalid_password") {
                unlockError = i18n.getMessage("migrate_legacy_error_password");
            } else if (e instanceof LegacySettingsMigrationError && e.code === "no_accounts") {
                unlockError = i18n.getMessage("migrate_legacy_error_no_accounts");
            } else {
                unlockError = i18n.getMessage("migrate_legacy_error_generic");
            }
        } finally {
            unlocking = false;
        }
    }

    async function probeConnection(conn: EditableConnection) {
        conn.connectionStatus = "checking";
        conn.vaultStatus = "checking";
        conn.statusMessage = "";

        if (!conn.baseUrl.startsWith("https://") && !conn.baseUrl.startsWith("http://")) {
            conn.baseUrl = "https://" + conn.baseUrl;
        }
        conn.baseUrl = conn.baseUrl.replace(/\/$/, "");

        const result = await sendMessage("probeServerConnection", {
            baseUrl: conn.baseUrl,
            user: conn.user,
            token: conn.token,
            persistence: "",
            backendAppId: conn.backendAppId,
            vaultGuid: conn.vaultGuid || undefined,
            vaultPassword: conn.vaultPassword || undefined,
        });

        if (result.backendAppId) {
            conn.backendAppId = result.backendAppId;
        }

        if (result.status) {
            conn.connectionStatus = "ok";
            conn.statusMessage = result.message;
            conn.vaultSelectionList = result.vaultSelectionList;
            if (conn.vaultGuid) {
                const match = result.vaultSelectionList.find((v) => v.guid === conn.vaultGuid);
                if (match) {
                    conn.selectedVaultInfo = match;
                    conn.vaultName = match.name;
                }
            } else if (result.vaultSelectionList.length === 1) {
                conn.selectedVaultInfo = result.vaultSelectionList[0];
                conn.vaultGuid = result.vaultSelectionList[0].guid;
                conn.vaultName = result.vaultSelectionList[0].name;
            }
            if (conn.vaultGuid && conn.vaultPassword) {
                if (result.vaultUnlockOk === true) {
                    conn.vaultStatus = "ok";
                } else if (result.vaultUnlockOk === false) {
                    conn.vaultStatus = "error";
                    conn.statusMessage = i18n.getMessage("invalid_vault_password");
                } else {
                    conn.vaultStatus = "idle";
                }
            } else {
                conn.vaultStatus = "idle";
            }
        } else {
            conn.connectionStatus = "error";
            conn.vaultStatus = "error";
            conn.statusMessage = result.message || i18n.getMessage("login_failed");
        }
    }

    async function probeAllConnections() {
        probingAll = true;
        for (const conn of connections) {
            await probeConnection(conn);
        }
        probingAll = false;
    }

    function onVaultSelect(conn: EditableConnection, value: VaultOption | null) {
        const next = value ? { guid: value.guid, name: value.name } : null;
        if (
            conn.selectedVaultInfo?.guid === next?.guid &&
            conn.selectedVaultInfo?.name === next?.name &&
            conn.vaultGuid === (next?.guid ?? "") &&
            conn.vaultName === (next?.name ?? "")
        ) {
            return;
        }
        conn.selectedVaultInfo = next;
        conn.vaultGuid = next?.guid ?? "";
        conn.vaultName = next?.name ?? "";
        conn.vaultStatus = "idle";
    }

    function removeConnection(key: string) {
        if (connections.length <= 1) {
            return;
        }
        connections = connections.filter((c) => c.key !== key);
        if (activeKey === key) {
            activeKey = connections[0]?.key ?? "";
        }
    }

    function buildExtensionSettings(): ExtensionSettings {
        if (!baseExtensionSettings) {
            throw new Error("No preview loaded");
        }

        const nextcloudConnections: NextcloudServerInfoInterface[] = [];
        const vaultInfoByConnection: Record<string, DefaultVaultInfo> = {};

        for (const conn of connections) {
            if (conn.selectedVaultInfo) {
                conn.vaultGuid = conn.selectedVaultInfo.guid;
                conn.vaultName = conn.selectedVaultInfo.name;
            }
            const serverData: NextcloudServerInfoInterface = {
                baseUrl: conn.baseUrl.replace(/\/$/, ""),
                user: conn.user,
                token: conn.token,
                persistence: "",
                backendAppId: conn.backendAppId,
            };
            const connectionId = PassmanServerConnection.buildConnectionId(serverData);
            nextcloudConnections.push(serverData);
            if (conn.vaultGuid && conn.vaultPassword) {
                vaultInfoByConnection[connectionId] = {
                    guid: conn.vaultGuid,
                    name: conn.vaultName || conn.vaultGuid,
                    password: conn.vaultPassword,
                };
            }
        }

        const activeConn = connections.find((c) => c.key === activeKey) ?? connections[0];
        const activeConnectionId = connectionIdOf(activeConn);

        const mirrors = LegacySettingsMigrationService.syncConnectionMirrors(
            nextcloudConnections,
            activeConnectionId,
            vaultInfoByConnection
        );

        const parsedLength = Number.parseInt(generatedPasswordLength, 10);
        const passwordGeneratorConfiguration = {
            ...baseExtensionSettings[ExtensionSettingsOptions.passwordGeneratorConfiguration],
            length: Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : 12,
        };

        const ignoredSites = ignoredSitesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        return {
            ...baseExtensionSettings,
            ...mirrors,
            [ExtensionSettingsOptions.ignoreProtocol]: ignoreProtocol,
            [ExtensionSettingsOptions.ignoreSubdomain]: ignoreSubdomain,
            [ExtensionSettingsOptions.ignorePath]: ignorePath,
            [ExtensionSettingsOptions.ignorePort]: ignorePort,
            [ExtensionSettingsOptions.autofillEnabled]: autofillEnabled,
            [ExtensionSettingsOptions.passwordGeneratorConfiguration]: passwordGeneratorConfiguration,
            [ExtensionSettingsOptions.pageRules]:
                LegacySettingsMigrationService.mapIgnoredSitesListToPageRules(ignoredSites),
        };
    }

    async function commitImport() {
        commitError = "";
        committing = true;
        try {
            const settings = buildExtensionSettings();
            const result = await LegacySettingsMigrationService.commitMigration(
                unlockedMasterPassword,
                settings
            );
            NotyService.notySuccess(
                i18n.getMessage("migrate_legacy_success", [String(result.connectionCount)])
            );
            extensionUnlockStateStore.set(ExtensionUnlockState.UNLOCKED);
            ExtensionUnlockService.setSetupDone().then(() => {
                push('/home');
            });
        } catch (e) {
            if (e instanceof LegacySettingsMigrationError && e.code === "no_accounts") {
                commitError = i18n.getMessage("migrate_legacy_error_no_accounts");
            } else {
                commitError = i18n.getMessage("migrate_legacy_error_generic");
            }
        } finally {
            committing = false;
        }
    }

    function statusLabel(status: ProbeStatus): string {
        switch (status) {
            case "checking":
                return i18n.getMessage("migrate_legacy_status_checking");
            case "ok":
                return i18n.getMessage("login_succeeded");
            case "error":
                return i18n.getMessage("login_failed");
            default:
                return i18n.getMessage("migrate_legacy_status_idle");
        }
    }

    function statusClass(status: ProbeStatus): string {
        switch (status) {
            case "ok":
                return "text-green-700";
            case "error":
                return "text-red-600";
            case "checking":
                return "text-sky-700";
            default:
                return "text-gray-500";
        }
    }
</script>

<div class="flex h-full flex-col items-center px-6 py-8">
    <div class="setup-fancy flex w-full max-w-lg flex-col items-center">
        <div class="mb-5 flex flex-col items-center text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007ac7] shadow-md shadow-[#007ac7]/25">
                <img src="{passmanImage}" class="h-9 w-9" alt="{i18n.getMessage('extName')}"/>
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-gray-800">
                {i18n.getMessage("migrate_legacy_page_title")}
            </h2>
            <p class="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                {unlockStep
                    ? i18n.getMessage("migrate_legacy_page_intro_unlock")
                    : i18n.getMessage("migrate_legacy_page_intro_review")}
            </p>
        </div>

        {#if unlockStep}
            <Card additionalClasses="w-full text-left space-y-3">
                <form onsubmit={(e) => { e.preventDefault(); unlockLegacy(); }}>
                    <CustomInputField
                        label={i18n.getMessage('migrate_legacy_password')}
                        bind:value={masterPassword}
                        type="password"
                        tabindex={1}
                    />
                    <p class="mt-2 text-xs leading-snug text-gray-500">
                        {i18n.getMessage("migrate_legacy_hint")}
                    </p>
                    {#if unlockError}
                        <p class="mt-2 text-xs text-red-600">{unlockError}</p>
                    {/if}
                    <div class="mt-4 flex flex-wrap gap-2">
                        <OnClickButton
                            callback={unlockLegacy}
                            disabled={masterPassword === "" || unlocking}
                            additionalClasses="border-primary text-primary hover:bg-primary hover:text-white"
                        >
                            {#if unlocking}
                                <Icon data={refresh} scale={1.3} spin={true}/>
                            {:else}
                                {i18n.getMessage("migrate_legacy_continue_review")}
                            {/if}
                        </OnClickButton>
                        <OnClickButton callback={() => push("/setup/start/0")}>
                            {i18n.getMessage("cancel")}
                        </OnClickButton>
                    </div>
                </form>
            </Card>
        {:else}
            <div class="w-full space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h3 class="text-base font-semibold text-gray-800">
                        {i18n.getMessage("server_connections")}
                    </h3>
                    <OnClickButton
                        small={true}
                        disabled={probingAll || committing}
                        callback={probeAllConnections}
                    >
                        {#if probingAll}
                            <Icon data={refresh} scale={1.1} spin={true}/>
                        {:else}
                            {i18n.getMessage("migrate_legacy_recheck_all")}
                        {/if}
                    </OnClickButton>
                </div>

                {#each connections as conn (conn.key)}
                    <Card additionalClasses="w-full text-left space-y-3">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                            <label class="flex items-center gap-2 text-sm font-medium text-gray-800">
                                <input
                                    type="radio"
                                    name="active-connection"
                                    checked={activeKey === conn.key}
                                    onchange={() => (activeKey = conn.key)}
                                />
                                {i18n.getMessage("migrate_legacy_set_active")}
                            </label>
                            <OnClickButton
                                small={true}
                                disabled={connections.length <= 1 || committing}
                                callback={() => removeConnection(conn.key)}
                                additionalClasses={connections.length <= 1 ? "" : "text-red-600"}
                            >
                                {i18n.getMessage("server_connection_remove")}
                            </OnClickButton>
                        </div>

                        <CustomInputField
                            label={i18n.getMessage('server_url')}
                            bind:value={conn.baseUrl}
                        />
                        <CustomInputField
                            label={i18n.getMessage('username')}
                            bind:value={conn.user}
                        />
                        <CustomInputField
                            label={i18n.getMessage('password')}
                            bind:value={conn.token}
                            type="password"
                        />

                        <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs space-y-1">
                            <div class="{statusClass(conn.connectionStatus)}">
                                {i18n.getMessage("server")}:
                                {statusLabel(conn.connectionStatus)}
                            </div>
                            <div class="{statusClass(conn.vaultStatus)}">
                                {i18n.getMessage("vault")}:
                                {statusLabel(conn.vaultStatus)}
                            </div>
                            {#if conn.statusMessage}
                                <div class="text-gray-600">{conn.statusMessage}</div>
                            {/if}
                        </div>

                        <div>
                            <label
                                class="mb-2 block text-sm font-medium text-primary-light-text dark:text-primary-dark-text"
                                for="vault-{conn.key}"
                            >
                                {i18n.getMessage("select_default_vault")}
                            </label>
                            {#if conn.vaultSelectionList.length > 0}
                                {#key vaultListKey(conn)}
                                    <Select
                                        multiple={false}
                                        clearable={true}
                                        label="name"
                                        itemId="guid"
                                        items={conn.vaultSelectionList}
                                        value={conn.selectedVaultInfo}
                                        on:change={(e) => onVaultSelect(conn, e.detail ?? null)}
                                        on:clear={() => onVaultSelect(conn, null)}
                                        id="vault-{conn.key}"
                                        --height="38px"
                                    />
                                {/key}
                            {:else}
                                <CustomInputField
                                    label={i18n.getMessage('default_vault')}
                                    bind:value={conn.vaultName}
                                    placeholder={conn.vaultGuid}
                                />
                            {/if}
                        </div>
                        <CustomInputField
                            label={i18n.getMessage('vault_password')}
                            bind:value={conn.vaultPassword}
                            type="password"
                        />

                        <OnClickButton
                            small={true}
                            disabled={conn.connectionStatus === "checking" || committing}
                            callback={() => probeConnection(conn)}
                        >
                            {i18n.getMessage("migrate_legacy_test_connection")}
                        </OnClickButton>
                    </Card>
                {/each}

                <Card additionalClasses="w-full text-left space-y-3">
                    <h3 class="text-base font-semibold text-gray-800">
                        {i18n.getMessage("migrate_legacy_prefs_title")}
                    </h3>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={ignoreProtocol} />
                        {i18n.getMessage("ignore_protocol")}
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={ignoreSubdomain} />
                        {i18n.getMessage("ignore_subdomain")}
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={ignorePath} />
                        {i18n.getMessage("ignore_path")}
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={ignorePort} />
                        {i18n.getMessage("ignore_port")}
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" bind:checked={autofillEnabled} />
                        {i18n.getMessage("enable_autofill")}
                    </label>
                    <CustomInputField
                        label={i18n.getMessage('pw_length')}
                        bind:value={generatedPasswordLength}
                        type="number"
                    />
                    <CustomInputField
                        label={i18n.getMessage('ignored_sites')}
                        bind:value={ignoredSitesText}
                        type="textarea"
                    />
                    <p class="text-xs text-gray-500">
                        {i18n.getMessage("migrate_legacy_ignored_sites_hint")}
                    </p>
                </Card>

                {#if commitError}
                    <p class="text-sm text-red-600">{commitError}</p>
                {/if}

                <div class="flex flex-wrap gap-2 pb-4">
                    <OnClickButton
                        callback={commitImport}
                        disabled={committing || connections.length < 1 || connections.some((c) => c.vaultStatus !== "ok")}
                        additionalClasses="border-primary text-primary hover:bg-primary hover:text-white"
                    >
                        {#if committing}
                            <Icon data={refresh} scale={1.3} spin={true}/>
                        {:else}
                            {i18n.getMessage("migrate_legacy_confirm")}
                        {/if}
                    </OnClickButton>
                    <OnClickButton disabled={committing} callback={() => push("/setup/start/0")}>
                        {i18n.getMessage("cancel")}
                    </OnClickButton>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .setup-fancy {
        animation: setup-fancy-in 420ms ease-out both;
    }

    @keyframes setup-fancy-in {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
