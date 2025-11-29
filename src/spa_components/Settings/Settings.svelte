<script module lang="ts">
    export enum SETTINGS_SECTIONS {
        INITIAL,
        NEXTCLOUD_SERVER_SETUP,
        PAGE_RULES,
        EXTENDED_SETTINGS,
    }
</script>
<script lang="ts">
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import { server, sliders, cog, cogs } from "svelte-awesome/icons";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import NextcloudServerSettings from "~/spa_components/Settings/NextcloudServerSettings.svelte";
    import InitialSettingsSelectionCards from "~/spa_components/Settings/InitialSettingsSelectionCards.svelte";
    import PageRules from "~/spa_components/Settings/PageRules.svelte";
    import ExtendedSettings from "~/spa_components/Settings/ExtendedSettings.svelte";
    import { i18n } from "~/lib/i18n";
    import Utils from "~/lib/Utils";

    let selectedSettingsSection: SETTINGS_SECTIONS = SETTINGS_SECTIONS.INITIAL;

    const selectSettingsSection = (section: SETTINGS_SECTIONS) => {
        selectedSettingsSection = section;
    }

    onMount(() => {
        ExtensionUnlockService.isSetupDone().then(async (isSetupDone) => {
            if (!isSetupDone) {
                push('/setup/server');
            }
        });
    });
</script>

<div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b border-gray-200 dark:border-gray-500 p-2 bg-white">
    <OnClickButton callback={() => selectSettingsSection(SETTINGS_SECTIONS.INITIAL)} additionalClasses="w-12"
        title={Utils.titleCase(i18n.getMessage('settings'))}>
        <Icon data={cogs} scale={1.3}/>
    </OnClickButton>
    <OnClickButton callback={() => selectSettingsSection(SETTINGS_SECTIONS.NEXTCLOUD_SERVER_SETUP)} additionalClasses="w-12"
        title={Utils.titleCase(i18n.getMessage('nextcloud_server_setup'))}>
        <Icon data={server} scale={1.3}/>
    </OnClickButton>
    <OnClickButton callback={() => selectSettingsSection(SETTINGS_SECTIONS.PAGE_RULES)} additionalClasses="w-12"
        title={Utils.titleCase(i18n.getMessage('page_rules'))}>
        <Icon data={sliders} scale={1.3}/>
    </OnClickButton>
    <OnClickButton callback={() => selectSettingsSection(SETTINGS_SECTIONS.EXTENDED_SETTINGS)} additionalClasses="w-12"
        title={Utils.titleCase(i18n.getMessage('extended_settings'))}>
        <Icon data={cog} scale={1.3}/>
    </OnClickButton>
</div>

<div class="mx-auto flex flex-col p-5 w-full items-center justify-center">
    {#if selectedSettingsSection === SETTINGS_SECTIONS.NEXTCLOUD_SERVER_SETUP}
        <NextcloudServerSettings/>
    {:else if selectedSettingsSection === SETTINGS_SECTIONS.PAGE_RULES}
        <PageRules/>
    {:else if selectedSettingsSection === SETTINGS_SECTIONS.EXTENDED_SETTINGS}
        <ExtendedSettings/>
    {:else}
        <InitialSettingsSelectionCards bind:selectedSettingsSection/>
    {/if}
</div>
