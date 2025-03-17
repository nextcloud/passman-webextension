<script lang="ts">
    import { field, form } from 'svelte-forms';
    import { min, required } from 'svelte-forms/validators';
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import Card from "~spa_partials/Card.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~services/ExtensionUnlockService";
    import { push } from "~Router.svelte";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import Select from 'svelte-select';
    import type {
        NextcloudServerInfoInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
    import NotyService from "~services/frontend/NotyService";

    const i18n = chrome.i18n;
    const server = field('server', '', [required(), min(8)], { checkOnInit: true });
    const user = field('user', '', [required(), min(3)], { checkOnInit: true });
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

    const login = async (): Promise<void> => {
        lockLoginButton = true;
        errorMessage = '';
        successMessage = '';

        if (!$server.value.startsWith('https://') && !$server.value.startsWith('http://')) {
            // throw new ConfigurationError('Base URL (or protocol) is invalid');
            // inject with https:// instead of throwing an error
            $server.value = 'https://'.concat($server.value);
        }

        const loginData: NextcloudServerInfoInterface = {
            baseUrl: $server.value,
            user: $user.value,
            token: $token.value,
            persistence: ''
        };

        sendToBackground({
            name: "addNewServerConnection",
            body: loginData
        }).then(async (value) => {
            console.log(value.status);
            console.log(value.message);
            console.log(value.vaultSelectionList);

            if (value.status) {
                successMessage = value.message;
                vaultSelectionList = value.vaultSelectionList;
                serverSettingsValidated = true;
            } else {
                errorMessage = value.message;
            }

            lockLoginButton = false;
        });
    };

    const setDefaultVault = () => {
        if (!selectedVaultInfo) {
            console.error('No selected vault info found');
            // todo: we need this as translated error message here (any in may other places)
            NotyService.notyError('No selected vault info found');
            return;
        }
        lockDefaultVaultButton = true;
        sendToBackground({
            name: "setDefaultVault",
            body: {
                guid: selectedVaultInfo.guid,
                password: selectedVaultPassword
            }
        }).then((value) => {
            if (value.status) {
                ExtensionUnlockService.isSetupDone().then((isSetupDone) => {
                    if (!isSetupDone) {
                        ExtensionUnlockService.setSetupDone().then(() => {
                            push('/home');
                        });
                    }
                });
            }
            vaultErrorMessage = value.errorMessage ?? '';

            lockDefaultVaultButton = false;
        });
    };

    const reloadPossibleVaultsInfo = async () => {
        lockDefaultVaultButton = true;
        return sendToBackground({
            name: "getPossibleVaultsInfo"
        }).then((value) => {
            if (value.status) {
                vaultSelectionList = value.vaultSelectionList;
            } else {
                vaultErrorMessage = value.errorMessage;
            }

            lockDefaultVaultButton = false;
        });
    };

    onMount(() => {
        ExtensionUnlockService.isUnlocked().then((isUnlocked) => {
            lockLoginButton = !isUnlocked;

            ExtensionUnlockService.isSetupDone().then(async (isSetupDone) => {
                if (isSetupDone) {
                    // populate input fields with current settings
                    await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.nextcloudServerAuthInfo)
                        .then((settings) => {
                            if (settings) {
                                server.set(settings.baseUrl);
                                user.set(settings.user);
                                token.set(settings.token);
                            } else {
                                NotyService.notyError("Could not get Nextcloud server settings");
                            }
                        });
                    await reloadPossibleVaultsInfo();
                    await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then((defaultVaultInfo) => {
                        if (!defaultVaultInfo) {
                            console.error('No default vault info found');
                            // todo: we need this as translated error message here (any in may other places)
                            NotyService.notyError('No default vault info found');
                            return;
                        }
                        for (let info of vaultSelectionList) {
                            if (info.guid === defaultVaultInfo.guid) {
                                selectedVaultInfo = info;
                                break;
                            }
                        }
                        if (selectedVaultInfo) {
                            // inject vault password only if the selected vault could be found
                            selectedVaultPassword = defaultVaultInfo.password
                        }
                    });

                    // todo: should we set this true, even if defaultVaultInfo was not found in the previous call?
                    serverSettingsValidated = true;
                }
            });
        });
    });
</script>

<div class="mx-auto flex flex-col p-5 w-full items-center justify-center">
    <Card additionalClasses="text-left mb-6 space-y-3 w-full">
        <p>
            This extension requires the
            <a href="https://apps.nextcloud.com/apps/passman" class="link" target="_blank">Passman App</a>
            to be installed on your Nextcloud server.
        </p>
        <p>
            No data is transferred to sources other than the specified Nextcloud server.
        </p>
    </Card>
    <Card additionalClasses="text-left w-full mb-6">
        <CustomInputField label="{i18n.getMessage('server_url')}" bind:value={$server.value}/>
        <div class="mt-2">
            <CustomInputField label="{i18n.getMessage('username')}" bind:value={$user.value}/>
        </div>
        <div class="mt-2">
            <CustomInputField label="{i18n.getMessage('password')}" bind:value={$token.value}
                              type="password"/>
        </div>
        <div class="mt-4">
            <OnClickButton disabled={!$myForm.valid || lockLoginButton} callback="{login}">
                {#if lockLoginButton}
                    <Icon data={refresh} scale={1.3} spin="{true}"/>
                {:else}
                    {i18n.getMessage('save')}
                {/if}
            </OnClickButton>
        </div>

        <div class="mt-2 text-green-600">
            {successMessage}
        </div>
        <div class="mt-2 text-red-600">
            {errorMessage}
        </div>
    </Card>
    {#if serverSettingsValidated}
        <Card additionalClasses="text-left space-y-3 w-full">
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
                    Save default vault settings
                {/if}
            </OnClickButton>
        </Card>
    {/if}
</div>
