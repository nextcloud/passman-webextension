<script lang="ts">
    import { field, form } from 'svelte-forms';
    import { min, required } from 'svelte-forms/validators';
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import Card from "~/spa_partials/Card.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount, tick } from "svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import PassmanClientService from "~/services/PassmanClientService";
    import Select from 'svelte-select';
    import type {
        NextcloudServerInfoInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
    import NotyService from "~/services/frontend/NotyService";
    import extensionUnlockStateStore, { ExtensionUnlockState } from '~/stores/extensionUnlockStateStore';
    import { i18n } from "~/lib/i18n";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import type { ServerConnectionListItem } from "@/entrypoints/background/messages/listServerConnections";
    import { logger } from "~/services/ConsoleLoggingService";

    const server = field('server', '', [required()], { checkOnInit: true });
    const user = field('user', '', [required()], { checkOnInit: true });
    const token = field('token', '', [required()], { checkOnInit: true });
    const myForm = form(server, user, token);

    let vaultErrorMessage = "";
    let errorMessage = "";
    let successMessage = "";
    let serverSettingsValidated = false;
    let vaultSelectionList: { guid: string, name: string }[] = [];
    let selectedVaultInfo: { guid: string, name: string } | null = null;
    let selectedVaultPassword: string | null = null;
    let lockLoginButton = false;
    let lockDefaultVaultButton = false;
    let lockDirectoryAction = false;
    let isSetupDone: boolean|null = null;
    let connections: ServerConnectionListItem[] = [];
    /** When setup is done: show add form instead of only the directory list. */
    let showAddConnectionForm = false;
    let vaultSelectionSection: HTMLElement | undefined;

    const scrollToVaultSelection = async () => {
        await tick();
        vaultSelectionSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const clearFormFields = () => {
        server.set('');
        user.set('');
        token.set('');
    };

    const populateFormFromActiveConnection = async () => {
        const settings = await ExtensionSettingsService.getPartialExtensionSettings(
            ExtensionSettingsOptions.nextcloudServerAuthInfo
        );
        if (settings) {
            server.set(settings.baseUrl);
            user.set(settings.user);
            token.set(settings.token);
        }
    };

    const loadConnectionDirectory = async () => {
        const result = await sendMessage('listServerConnections');
        if (result.status) {
            connections = result.connections;
        } else if (result.errorMessage) {
            NotyService.notyError(result.errorMessage);
        }
    };

    const loadActiveVaultSelection = async () => {
        selectedVaultInfo = null;
        selectedVaultPassword = null;
        vaultErrorMessage = '';
        await reloadPossibleVaultsInfo();
        const defaultVaultInfo = await ExtensionSettingsService.getPartialExtensionSettings(
            ExtensionSettingsOptions.defaultVaultInfo
        );
        if (!defaultVaultInfo) {
            return;
        }
        for (const info of vaultSelectionList) {
            if (info.guid === defaultVaultInfo.guid) {
                selectedVaultInfo = info;
                break;
            }
        }
        if (selectedVaultInfo) {
            selectedVaultPassword = defaultVaultInfo.password;
        }
    };

    const login = async (): Promise<void> => {
        if (!$myForm.valid || lockLoginButton) {
            return;
        }

        lockLoginButton = true;
        errorMessage = '';
        successMessage = '';

        if (!$server.value.startsWith('https://') && !$server.value.startsWith('http://')) {
            $server.value = 'https://'.concat($server.value);
        }

        const loginData: NextcloudServerInfoInterface & { makeActive?: boolean } = {
            baseUrl: $server.value,
            user: $user.value,
            token: $token.value,
            persistence: '',
            makeActive: true,
        };

        sendMessage('addNewServerConnection', loginData).then(async (value) => {
            if (value.status) {
                // Mutate this realm's client; background already updated the SW client.
                const authInfo = await ExtensionSettingsService.getPartialExtensionSettings(
                    ExtensionSettingsOptions.nextcloudServerAuthInfo
                );
                if (authInfo) {
                    await PassmanClientService.ensureConnectionLocally(authInfo, true);
                }
                successMessage = value.message;
                vaultSelectionList = value.vaultSelectionList;
                serverSettingsValidated = true;
                showAddConnectionForm = false;
                if (isSetupDone) {
                    await loadConnectionDirectory();
                    await loadActiveVaultSelection();
                }
                await scrollToVaultSelection();
            } else {
                errorMessage = value.message;
            }

            lockLoginButton = false;
        });
    };

    const setDefaultVault = () => {
        if (!selectedVaultPassword || !selectedVaultInfo || lockDefaultVaultButton) {
            if (!selectedVaultInfo) {
                logger.error(i18n.getMessage('no_selected_vault_info_found'));
                NotyService.notyError(i18n.getMessage('no_selected_vault_info_found'));
            }
            return;
        }
        lockDefaultVaultButton = true;

        sendMessage('setDefaultVault', {
            guid: selectedVaultInfo.guid,
            password: selectedVaultPassword
        }).then((value) => {
            if (value.status) {
                ExtensionUnlockService.isSetupDone().then((_isSetupDone) => {
                    if (!_isSetupDone) {
                        extensionUnlockStateStore.set(ExtensionUnlockState.UNLOCKED);
                        ExtensionUnlockService.setSetupDone().then(() => {
                            push('/home');
                        });
                    } else {
                        NotyService.notySuccess(i18n.getMessage('settings_updated_successfully'));
                    }
                });
            }
            vaultErrorMessage = value.errorMessage ?? '';

            lockDefaultVaultButton = false;
        });
    };

    const reloadPossibleVaultsInfo = async () => {
        lockDefaultVaultButton = true;

        return sendMessage('getPossibleVaultsInfo', undefined).then((value) => {
            if (value.status) {
                vaultSelectionList = value.vaultSelectionList;
            } else if (value.errorMessage !== null) {
                vaultErrorMessage = value.errorMessage;
            }

            lockDefaultVaultButton = false;
        });
    };

    const switchConnection = async (connectionId: string) => {
        lockDirectoryAction = true;
        errorMessage = '';
        const result = await sendMessage('setActiveServerConnection', { connectionId });
        if (result.status) {
            PassmanClientService.applyActiveConnectionLocally(connectionId);
            showAddConnectionForm = false;
            await loadConnectionDirectory();
            await populateFormFromActiveConnection();
            await loadActiveVaultSelection();
            serverSettingsValidated = true;
            NotyService.notySuccess(i18n.getMessage('server_connection_switched'));
        } else {
            NotyService.notyError(result.errorMessage ?? i18n.getMessage('server_connection_switch_failed'));
        }
        lockDirectoryAction = false;
    };

    const removeConnection = async (connectionId: string) => {
        if (!confirm(i18n.getMessage('server_connection_remove_confirm'))) {
            return;
        }
        lockDirectoryAction = true;
        const result = await sendMessage('removeServerConnection', { connectionId });
        if (result.status) {
            if (result.activeConnectionId) {
                PassmanClientService.dropConnectionLocally(connectionId, result.activeConnectionId);
            }
            await loadConnectionDirectory();
            await populateFormFromActiveConnection();
            await loadActiveVaultSelection();
            serverSettingsValidated = true;
            NotyService.notySuccess(i18n.getMessage('server_connection_removed'));
        } else {
            NotyService.notyError(result.errorMessage ?? i18n.getMessage('server_connection_remove_failed'));
        }
        lockDirectoryAction = false;
    };

    const startAddConnection = () => {
        showAddConnectionForm = true;
        clearFormFields();
        errorMessage = '';
        successMessage = '';
    };

    const cancelAddConnection = async () => {
        showAddConnectionForm = false;
        errorMessage = '';
        successMessage = '';
        await populateFormFromActiveConnection();
    };

    onMount(() => {
        ExtensionUnlockService.isUnlocked().then((isUnlocked) => {
            lockLoginButton = !isUnlocked;

            ExtensionUnlockService.isSetupDone().then(async (_isSetupDone) => {
                isSetupDone = _isSetupDone;
                if (isSetupDone) {
                    await loadConnectionDirectory();
                    await populateFormFromActiveConnection();
                    await loadActiveVaultSelection();
                    serverSettingsValidated = true;
                }
            });
        });
    });
</script>

{#if (!serverSettingsValidated && isSetupDone !== false) }
    <Loading/>
{:else}
    <Card additionalClasses="text-left mb-6 space-y-3 w-full">
        <p>
            {@html i18n.getMessage('passman_app_required', [
                '<a href="https://apps.nextcloud.com/apps/passman" class="link" target="_blank">',
                '</a>'
            ])}
        </p>
        <p>
            {i18n.getMessage('no_data_transferred_elsewhere')}
        </p>
        {#if !isSetupDone}
            <p>
                {i18n.getMessage("extra_accounts")}
            </p>
        {/if}
    </Card>

    {#if isSetupDone}
        <Card additionalClasses="text-left w-full mb-6 space-y-3">
            <h3 class="text-base font-medium text-primary-light-text dark:text-primary-dark-text">
                {i18n.getMessage('server_connections')}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                {i18n.getMessage('server_connections_desc')}
            </p>
            <ul class="divide-y divide-gray-200 dark:divide-gray-600">
                {#each connections as connection (connection.connectionId)}
                    <li class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div class="min-w-0">
                            <div class="font-medium break-all mb-1">
                                {connection.baseUrl}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {connection.user}
                                {#if connection.selectedDefaultVaultName}
                                    · {connection.selectedDefaultVaultName}
                                {/if}
                                {#if connection.isActive}
                                    &nbsp;·&nbsp;
                                    <span class="text-xs font-normal text-green-700 dark:text-green-400">
                                        ({i18n.getMessage('server_connection_active')})
                                    </span>
                                {/if}
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 shrink-0">
                            {#if !connection.isActive}
                                <OnClickButton
                                    small={true}
                                    disabled={lockDirectoryAction}
                                    callback={() => switchConnection(connection.connectionId)}
                                >
                                    {i18n.getMessage('server_connection_switch')}
                                </OnClickButton>
                            {/if}
                            <OnClickButton
                                small={true}
                                disabled={lockDirectoryAction || connections.length <= 1}
                                callback={() => removeConnection(connection.connectionId)}
                                additionalClasses={connections.length <= 1 ? '' : 'text-red-600'}
                            >
                                {i18n.getMessage('server_connection_remove')}
                            </OnClickButton>
                        </div>
                    </li>
                {/each}
            </ul>
            {#if !showAddConnectionForm}
                <OnClickButton disabled={lockDirectoryAction} callback={startAddConnection}>
                    {i18n.getMessage('server_connection_add')}
                </OnClickButton>
            {/if}
        </Card>
    {/if}

    <Card additionalClasses="text-left w-full mb-6">
        {#if isSetupDone}
            <h3 class="text-base font-medium mb-3 text-primary-light-text dark:text-primary-dark-text">
                {#if showAddConnectionForm}
                    {i18n.getMessage('server_connection_add')}
                {:else}
                    {i18n.getMessage('server_connection_edit_active')}
                {/if}
            </h3>
        {/if}
        <form on:submit|preventDefault={login}>
            <CustomInputField label="{i18n.getMessage('server_url')}" bind:value={$server.value}/>
            <div class="mt-2">
                <CustomInputField label="{i18n.getMessage('username')}" bind:value={$user.value}/>
            </div>
            <div class="mt-2">
                <CustomInputField label="{i18n.getMessage('password')}" bind:value={$token.value}
                                    type="password"/>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
                <OnClickButton disabled={!$myForm.valid || lockLoginButton} callback="{login}">
                    {#if lockLoginButton}
                        <Icon data={refresh} scale={1.3} spin="{true}"/>
                    {:else}
                        {i18n.getMessage('save')}
                    {/if}
                </OnClickButton>
                {#if showAddConnectionForm}
                    <OnClickButton disabled={lockLoginButton} callback={cancelAddConnection}>
                        {i18n.getMessage('cancel')}
                    </OnClickButton>
                {/if}
            </div>
        </form>

        <div class="mt-2 text-green-600">
            {successMessage}
        </div>
        <div class="mt-2 text-red-600">
            {errorMessage}
        </div>
    </Card>
{/if}

{#if serverSettingsValidated}
    <div bind:this={vaultSelectionSection}>
        <Card additionalClasses="text-left space-y-3 w-full">
            <form on:submit|preventDefault={setDefaultVault}>
                <p>
                    {i18n.getMessage('default_vault_desc')}
                </p>
                <div class="mt-2">
                    <label for="vaults_select"
                            class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2">
                        {i18n.getMessage('select_default_vault')}
                    </label>
                    <div class="my-2">
                        {#key vaultSelectionList}
                            <Select
                                    disabled={lockDefaultVaultButton}
                                    multiple={false}
                                    label="name"
                                    itemId="guid"
                                    items={vaultSelectionList}
                                    bind:value={selectedVaultInfo}
                                    id="vaults_select"
                                    --height="38px"
                            />
                        {/key}
                    </div>
                </div>
                <div class="mt-2">
                    <CustomInputField label="{i18n.getMessage('vault_password')}" bind:value={selectedVaultPassword}
                                        type="password"/>
                </div>
                <div class="mt-2 text-red-600">
                    {vaultErrorMessage}
                </div>
                <OnClickButton disabled={!selectedVaultPassword || !selectedVaultInfo || lockDefaultVaultButton}
                                callback="{setDefaultVault}">
                    {#if lockDefaultVaultButton}
                        <Icon data={refresh} scale={1.3} spin="{true}"/>
                    {:else}
                        {i18n.getMessage('save_default_vault_settings')}
                    {/if}
                </OnClickButton>
            </form>
        </Card>
    </div>
{/if}
