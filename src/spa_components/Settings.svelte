<script lang="ts">
    import Card from "~spa_partials/Card.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~services/ExtensionUnlockService";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import CustomCheckboxField from "~spa_partials/FormElements/CustomCheckboxField.svelte";
    import { push } from "~Router.svelte";
    import Loading from "~spa_components/Loading.svelte";
    import NotyService from "~services/frontend/NotyService";
    import NextcloudServerSetup from "~spa_components/NextcloudServerSetup.svelte";

    const i18n = chrome.i18n;
    let extendedSettings: { [key: number]: boolean } = {
        [ExtensionSettingsOptions.ignoreProtocol]: false,
        [ExtensionSettingsOptions.ignoreSubdomain]: false,
        [ExtensionSettingsOptions.ignorePath]: true,
        [ExtensionSettingsOptions.ignorePort]: false,
        [ExtensionSettingsOptions.autofillEnabled]: false,
    };


    let lockSaveButton = false;
    let pageIsLoading = true;

    const save = async () => {
        lockSaveButton = true;
        for (let i of Object.keys(extendedSettings)) {
            const settingId = parseInt(i) as ExtensionSettingsOptions;
            const settingValue = extendedSettings[settingId];
            await ExtensionSettingsService.updatePartialExtensionSettings(settingId, settingValue);
        }
        NotyService.notySuccess(i18n.getMessage('settings_updated_successfully'));
        lockSaveButton = false;
    }

    onMount(() => {
        ExtensionUnlockService.isSetupDone().then(async (isSetupDone) => {
            if (isSetupDone) {
                if (await ExtensionUnlockService.isUnlocked()) {
                    // populate input fields with current settings
                    extendedSettings[ExtensionSettingsOptions.ignoreProtocol] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignoreProtocol)
                        ?? extendedSettings[ExtensionSettingsOptions.ignoreProtocol];
                    extendedSettings[ExtensionSettingsOptions.ignoreSubdomain] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignoreSubdomain)
                        ?? extendedSettings[ExtensionSettingsOptions.ignoreSubdomain];
                    extendedSettings[ExtensionSettingsOptions.ignorePath] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignorePath)
                        ?? extendedSettings[ExtensionSettingsOptions.ignorePath];
                    extendedSettings[ExtensionSettingsOptions.ignorePort] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignorePort)
                        ?? extendedSettings[ExtensionSettingsOptions.ignorePort];
                    extendedSettings[ExtensionSettingsOptions.autofillEnabled] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.autofillEnabled)
                        ?? extendedSettings[ExtensionSettingsOptions.autofillEnabled];
                } else {
                    push('/unlock');
                }
            } else {
                push('/setup/server');
            }
            pageIsLoading = false;
        });
    });
</script>

<NextcloudServerSetup/>
<div class="mx-auto flex flex-col p-5 w-full items-center justify-center">
    {#if pageIsLoading}
        <Loading/>
    {:else}
        <Card additionalClasses="text-left mb-6 space-y-3 w-full">
            <p>
                {i18n.getMessage('extended_settings')}
            </p>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreProtocol]}
                                 id="ignoreProtocol"
                                 label="{i18n.getMessage('ignore_protocol')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreSubdomain]}
                                 id="ignoreSubdomain"
                                 label="{i18n.getMessage('ignore_subdomain')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePath]}
                                 id="ignorePath"
                                 label="{i18n.getMessage('ignore_path')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePort]}
                                 id="ignorePort"
                                 label="{i18n.getMessage('ignore_port')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.autofillEnabled]}
                                 id="enable_autofill"
                                 label="{i18n.getMessage('enable_autofill')}"/>
        </Card>

        <OnClickButton callback="{save}">
            {#if lockSaveButton}
                <Icon data={refresh} scale={1.3} spin="{true}"/>
            {:else}
                {i18n.getMessage('save_settings')}
            {/if}
        </OnClickButton>
    {/if}
</div>
