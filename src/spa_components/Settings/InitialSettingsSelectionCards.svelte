<script lang="ts">
    import Card from "~/spa_partials/Card.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { server, sliders, cog } from "svelte-awesome/icons";
    import { SETTINGS_SECTIONS } from "~/spa_components/Settings/Settings.svelte";
    import packageJson from "../../../package.json";
    import { i18n } from "~/lib/i18n";
    import Utils from "~/lib/Utils";

    export let selectedSettingsSection: SETTINGS_SECTIONS;

    const extensionVersion = packageJson.version;
    const paddingClasses = 'p-4 xl:p-6';

    const selectSettingsSection = (section: SETTINGS_SECTIONS) => {
        selectedSettingsSection = section;
    }
</script>

<div class="flex flex-col gap-4">
    <button onclick={() => selectSettingsSection(SETTINGS_SECTIONS.NEXTCLOUD_SERVER_SETUP)} class="cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-300">
        <Card paddingClasses={paddingClasses}>
            <span class="flex items-center gap-2 justify-center align-middle">
                <Icon data={server} scale={1.2} class="pt-[2px]"/>
                <span class="text-lg font-semibold">{Utils.titleCase(i18n.getMessage('nextcloud_server_setup'))}</span>
            </span>
            <p class="text-sm text-gray-500 mt-2">{i18n.getMessage('nextcloud_server_setup_description')}</p>
        </Card>  
    </button>
    <button onclick={() => selectSettingsSection(SETTINGS_SECTIONS.PAGE_RULES)} class="cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-300">
        <Card paddingClasses={paddingClasses}>
            <span class="flex items-center gap-2 justify-center align-middle">
                <Icon data={sliders} scale={1.2} class="pt-[2px]"/>
                <span class="text-lg font-semibold">{Utils.titleCase(i18n.getMessage('page_rules'))}</span>
            </span>
            <p class="text-xs text-gray-500 mt-2">{i18n.getMessage('page_rules_description')}</p>
        </Card>
    </button>
    <button onclick={() => selectSettingsSection(SETTINGS_SECTIONS.EXTENDED_SETTINGS)} class="cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all duration-300">
        <Card paddingClasses={paddingClasses}>
            <span class="flex items-center gap-2 justify-center align-middle">
                <Icon data={cog} scale={1.2} class="pt-[2px]"/>
                <span class="text-lg font-semibold">{Utils.titleCase(i18n.getMessage('extended_settings'))}</span>
            </span>
            <p class="text-sm text-gray-500 mt-2">{i18n.getMessage('extended_settings_description')}</p>
        </Card>
    </button>
</div>

<div class="mt-4 bottom-21 left-0 right-0">
    <p class="text-sm text-gray-500 text-center">
        {i18n.getMessage('extension_version')}: {extensionVersion}
        (mv{import.meta.env.MANIFEST_VERSION}/{import.meta.env.BROWSER})
    </p>
</div>
