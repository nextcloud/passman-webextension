<script lang="ts">
    import Card from "~/spa_partials/Card.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import NotyService from "~/services/frontend/NotyService";
    import packageJson from "../../../package.json";
    import { i18n } from "~/lib/i18n";

    const extensionVersion = packageJson.version;
    let extendedSettings: { [key: number]: boolean } = {
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
