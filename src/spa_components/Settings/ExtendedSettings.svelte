<script lang="ts">
    import Card from "~/spa_partials/Card.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import Select from 'svelte-select';
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import NotyService from "~/services/frontend/NotyService";
    import packageJson from "../../../package.json";
    import { i18n } from "~/lib/i18n";
    import CustomStorageService from "~/services/CustomStorageService";
    import type { IndexedDbModelStoreSizeEstimate } from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";
    import {
        DEFAULT_DOORHANGER_GRAVITY,
        DEFAULT_DOORHANGER_LAYOUT,
        normalizeDoorhangerSettings,
        type DoorhangerGravity,
        type DoorhangerLayout
    } from "~/lib/doorhanger/doorhangerSettings";

    const extensionVersion = packageJson.version;
    let extendedSettings: { [key: number]: boolean | string } = {
        [ExtensionSettingsOptions.ignoreProtocol]: false,
        [ExtensionSettingsOptions.ignoreSubdomain]: false,
        [ExtensionSettingsOptions.ignorePath]: true,
        [ExtensionSettingsOptions.ignorePort]: false,
        [ExtensionSettingsOptions.autofillEnabled]: false,
        [ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling]: true,
        [ExtensionSettingsOptions.enableUserEventBasedFormDetection]: true,
        [ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents]: false,
        [ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval]: false,
        [ExtensionSettingsOptions.enableFormDetectionByMutationObserver]: false,
        [ExtensionSettingsOptions.doorhangerLayout]: DEFAULT_DOORHANGER_LAYOUT,
        [ExtensionSettingsOptions.doorhangerGravity]: DEFAULT_DOORHANGER_GRAVITY,
    };

    const doorhangerLayoutOptions: { [key: string]: string } = {
        card: i18n.getMessage('doorhanger_layout_card'),
        topRow: i18n.getMessage('doorhanger_layout_top_row'),
    };
    const doorhangerGravityOptions: { [key: string]: string } = {
        'top-right': i18n.getMessage('doorhanger_gravity_top_right'),
        'top-left': i18n.getMessage('doorhanger_gravity_top_left'),
        'bottom-right': i18n.getMessage('doorhanger_gravity_bottom_right'),
        'bottom-left': i18n.getMessage('doorhanger_gravity_bottom_left'),
    };
    const doorhangerLayoutItems = Object.entries(doorhangerLayoutOptions).map(([key, value]) => ({
        label: value,
        value: key,
    }));
    const doorhangerGravityItems = Object.entries(doorhangerGravityOptions).map(([key, value]) => ({
        label: value,
        value: key,
    }));
    let doorhangerLayoutSelectValue = {
        label: doorhangerLayoutOptions[DEFAULT_DOORHANGER_LAYOUT],
        value: DEFAULT_DOORHANGER_LAYOUT,
    };
    let doorhangerGravitySelectValue = {
        label: doorhangerGravityOptions[DEFAULT_DOORHANGER_GRAVITY],
        value: DEFAULT_DOORHANGER_GRAVITY,
    };

    $: () => {
        extendedSettings[ExtensionSettingsOptions.doorhangerLayout] = doorhangerLayoutSelectValue.value;
        extendedSettings[ExtensionSettingsOptions.doorhangerGravity] = doorhangerGravitySelectValue.value;
    };

    let lockSaveButton = false;
    let pageIsLoading = true;
    let offlineCacheSize: IndexedDbModelStoreSizeEstimate | null = null;
    let offlineCacheSizeError = false;
    let offlineCacheSizeLoading = false;
    let clearingOfflineCache = false;

    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const refreshOfflineCacheSize = async () => {
        offlineCacheSizeLoading = true;
        offlineCacheSizeError = false;
        try {
            offlineCacheSize = await CustomStorageService.estimateOfflineModelStoreSize();
        } catch (e) {
            console.error(e);
            offlineCacheSize = null;
            offlineCacheSizeError = true;
        } finally {
            offlineCacheSizeLoading = false;
        }
    };

    const clearOfflineCache = async () => {
        if (!confirm(i18n.getMessage('clear_offline_cache_confirm'))) {
            return;
        }
        clearingOfflineCache = true;
        try {
            await CustomStorageService.clearOfflineModelStore();
            NotyService.notySuccess(i18n.getMessage('offline_cache_cleared_successfully'));
            await refreshOfflineCacheSize();
        } catch (e) {
            console.error(e);
            NotyService.notyError(i18n.getMessage('offline_cache_clear_failed'));
        } finally {
            clearingOfflineCache = false;
        }
    };

    const save = async () => {
        lockSaveButton = true;
        console.log(extendedSettings);
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
                    extendedSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling)
                        ?? extendedSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling];
                    extendedSettings[ExtensionSettingsOptions.enableUserEventBasedFormDetection] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableUserEventBasedFormDetection)
                        ?? extendedSettings[ExtensionSettingsOptions.enableUserEventBasedFormDetection];
                    extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents)
                        ?? extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents];
                    extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval)
                        ?? extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval];
                    extendedSettings[ExtensionSettingsOptions.enableFormDetectionByMutationObserver] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableFormDetectionByMutationObserver)
                        ?? extendedSettings[ExtensionSettingsOptions.enableFormDetectionByMutationObserver];
                    
                    doorhangerLayoutSelectValue.value = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.doorhangerLayout)
                        ?? doorhangerLayoutSelectValue.value;
                    doorhangerLayoutSelectValue.label = doorhangerLayoutOptions[doorhangerLayoutSelectValue.value];
                    doorhangerGravitySelectValue.value = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.doorhangerGravity)
                        ?? doorhangerGravitySelectValue.value;
                    doorhangerGravitySelectValue.label = doorhangerGravityOptions[doorhangerGravitySelectValue.value];

                    await refreshOfflineCacheSize();
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

{#if pageIsLoading}
    <Loading/>
{:else}
    <Card additionalClasses="text-left mb-6 space-y-3 w-full">
        <h2 class="text-xl font-semibold">{i18n.getMessage('extended_settings')}</h2>
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
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling]}
                                id="enableEmailAsUsernameFallbackFilling"
                                label="{i18n.getMessage('enable_email_as_username_fallback_filling')}"/>
        
        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('form_detection_settings')}</h3>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableUserEventBasedFormDetection]}
                                id="enableUserEventBasedFormDetection"
                                label="{i18n.getMessage('enable_user_event_based_form_detection')}"/>
        <p class="description-text">{i18n.getMessage('enable_user_event_based_form_detection_description')}</p>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents]}
                                id="enableFormDetectionOnUrlPopstateEvents"
                                label="{i18n.getMessage('enable_form_detection_on_url_popstate_events')}"/>
        <p class="description-text">{i18n.getMessage('enable_form_detection_on_url_popstate_events_description')}</p>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval]}
                                id="enableFormDetectionOnUrlChangesByInterval"
                                label="{i18n.getMessage('enable_form_detection_on_url_changes_by_interval')}"/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionByMutationObserver]}
                                id="enableFormDetectionByMutationObserver"
                                label="{i18n.getMessage('enable_form_detection_by_mutation_observer')}"/>
        <p class="description-text">{i18n.getMessage('enable_form_detection_by_mutation_observer_description')}</p>

        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('doorhanger_settings')}</h3>
        <p class="text-xs text-gray-500">{i18n.getMessage('doorhanger_settings_description')}</p>
        <div class="mt-2">
            <label for="doorhangerLayout"
                   class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2">
                {i18n.getMessage('doorhanger_layout')}
            </label>
            <div class="my-2">
                <Select
                    multiple={false}
                    clearable={false}
                    searchable={false}
                    showChevron={true}
                    label="label"
                    itemId="value"
                    items={doorhangerLayoutItems}
                    bind:value={doorhangerLayoutSelectValue}
                    id="doorhangerLayout"
                    --height="35px"
                    --font-size="14px"
                    containerStyles="height: 35px;"
                />
            </div>
            <p class="description-text pl-0!">{i18n.getMessage('doorhanger_layout_description')}</p>
        </div>
        <div class="mt-2">
            <label for="doorhangerGravity"
                   class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2">
                {i18n.getMessage('doorhanger_gravity')}
            </label>
            <div class="my-2">
                <Select
                    multiple={false}
                    clearable={false}
                    searchable={false}
                    showChevron={true}
                    label="label"
                    itemId="value"
                    items={doorhangerGravityItems}
                    bind:value={doorhangerGravitySelectValue}
                    id="doorhangerGravity"
                    --height="35px"
                    --font-size="14px"
                    containerStyles="height: 35px;"
                />
            </div>
            <p class="description-text pl-0!">{i18n.getMessage('doorhanger_gravity_description')}</p>
        </div>

        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('offline_cache')}</h3>
        <p class="text-xs text-gray-500">{i18n.getMessage('offline_cache_description')}</p>
        {#if offlineCacheSizeLoading}
            <p class="text-sm text-gray-500">{i18n.getMessage('offline_cache_size_loading')}</p>
        {:else if offlineCacheSizeError}
            <p class="text-sm text-red-600">{i18n.getMessage('offline_cache_size_unavailable')}</p>
        {:else if offlineCacheSize}
            <p class="text-sm text-gray-600">
                {i18n.getMessage('offline_cache_size', [
                    formatBytes(offlineCacheSize.bytes),
                    String(offlineCacheSize.credentialCount),
                    String(offlineCacheSize.vaultCount),
                ])}
            </p>
        {/if}
        <OnClickButton
            callback={clearOfflineCache}
            disabled={clearingOfflineCache}
            additionalClasses="border-red-300 text-red-600"
        >
            {#if clearingOfflineCache}
                <Icon data={refresh} scale={1.3} spin="{true}"/>
            {:else}
                {i18n.getMessage('clear_offline_cache')}
            {/if}
        </OnClickButton>
    </Card>

    <OnClickButton callback="{save}">
        {#if lockSaveButton}
            <Icon data={refresh} scale={1.3} spin="{true}"/>
        {:else}
            {i18n.getMessage('save_settings')}
        {/if}
    </OnClickButton>
{/if}

<div class="mt-4">
    <p class="text-sm text-gray-500 text-center">
        {i18n.getMessage('extension_version')}: {extensionVersion}
        (mv{import.meta.env.MANIFEST_VERSION}/{import.meta.env.BROWSER})
    </p>
</div>

<style>
    .description-text {
        /* text-sm */
        font-size: var(--text-xs) /* 12px */;
        line-height: var(--tw-leading, var(--text-sm--line-height) /* calc(1.25 / 0.875) ≈ 1.428571 */);

        color: #6b7280 /* text-gray-500 */;

        padding-left: 2rem;
        margin-top: -0.5rem;
    }
</style>
