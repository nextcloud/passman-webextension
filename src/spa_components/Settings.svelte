<script lang="ts">
    import Card from "~spa_partials/Card.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import UnlockExtensionService from "~services/UnlockExtensionService";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import CustomCheckboxField from "~spa_partials/FormElements/CustomCheckboxField.svelte";
    import { push } from "~Router.svelte";
    import Loading from "~spa_components/Loading.svelte";
    import NotyService from "~services/NotyService";
    import NextcloudServerSetup from "~spa_components/NextcloudServerSetup.svelte";

    let extendedSettings = {
        [ExtensionSettingsOptions.ignoreProtocol]: false,
        [ExtensionSettingsOptions.ignoreSubdomain]: false,
        [ExtensionSettingsOptions.ignorePath]: true,
        [ExtensionSettingsOptions.ignorePort]: false,
    };


    let lockSaveButton = false;
    let pageIsLoading = true;

    const save = async () => {
        lockSaveButton = true;
        for (let i of Object.keys(extendedSettings)) {
            const settingId = parseInt(i) as ExtensionSettingsOptions;
            await ExtensionSettingsService.updatePartialExtensionSettings(settingId, extendedSettings[settingId]);
        }
        NotyService.notySuccess('Settings updated successfully');
        lockSaveButton = false;
    }

    onMount(() => {
        UnlockExtensionService.isSetupDone().then(async (isSetupDone) => {
            if (isSetupDone) {
                // populate input fields with current settings
                extendedSettings[ExtensionSettingsOptions.ignoreProtocol] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignoreProtocol);
                extendedSettings[ExtensionSettingsOptions.ignoreSubdomain] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignoreSubdomain);
                extendedSettings[ExtensionSettingsOptions.ignorePath] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignorePath);
                extendedSettings[ExtensionSettingsOptions.ignorePort] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.ignorePort);
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
                Extended settings
            </p>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreProtocol]}
                                 id="ignoreProtocol"
                                 label="{chrome.i18n.getMessage('ignore_protocol')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreSubdomain]}
                                 id="ignoreSubdomain"
                                 label="{chrome.i18n.getMessage('ignore_subdomain')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePath]}
                                 id="ignorePath"
                                 label="{chrome.i18n.getMessage('ignore_path')}"/>
            <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePort]}
                                 id="ignorePort"
                                 label="{chrome.i18n.getMessage('ignore_port')}"/>
        </Card>

        <OnClickButton callback="{save}">
            {#if lockSaveButton}
                <Icon data={refresh} scale={1.3} spin="{true}"/>
            {:else}
                Save settings
            {/if}
        </OnClickButton>
    {/if}
</div>
