<script lang="ts">
    import Card from "~/spa_partials/Card.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { onMount } from "svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import ExtensionSettingsService, {
        ExtensionSettingsOptions,
        type ExtensionSettings,
    } from "~/services/ExtensionSettingsService";
    import ConsoleLoggingService, { logger } from "~/services/ConsoleLoggingService";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import Select from 'svelte-select';
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import NotyService from "~/services/frontend/NotyService";
    import packageJson from "../../../package.json";
    import { i18n } from "~/lib/i18n";
    import OfflineCachePersistenceService from "~/services/OfflineCachePersistenceService";
    import PassmanClientService from "~/services/PassmanClientService";
    import OfflineCacheStorageService, {
        type OfflineCacheStorageBackend,
    } from "~/services/OfflineCacheStorageService";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import ChangeUnlockPassword from "~/spa_components/Settings/ChangeUnlockPassword.svelte";
    import ExtensionAutoUnlockService from "~/services/ExtensionAutoUnlockService";
    import type { AutoUnlockKeyStorageBackend } from "@/lib/auto-unlock-key-store";
    import type { IndexedDbModelStoreSizeEstimate } from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";
    import {
        DEFAULT_DOORHANGER_GRAVITY,
        DEFAULT_DOORHANGER_LAYOUT,
    } from "~/lib/doorhanger/doorhangerSettings";
    import {
        DEFAULT_EXTENSION_LOG_LEVEL,
        EXTENSION_LOG_LEVELS,
        type ExtensionLogLevel,
    } from "~/lib/extensionLogLevel";

    type ExtendedSettingsForm = Pick<ExtensionSettings,
        | ExtensionSettingsOptions.ignoreProtocol
        | ExtensionSettingsOptions.ignoreSubdomain
        | ExtensionSettingsOptions.ignorePath
        | ExtensionSettingsOptions.ignorePort
        | ExtensionSettingsOptions.autofillEnabled
        | ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling
        | ExtensionSettingsOptions.enableUserEventBasedFormDetection
        | ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents
        | ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval
        | ExtensionSettingsOptions.enableFormDetectionByMutationObserver
        | ExtensionSettingsOptions.doorhangerLayout
        | ExtensionSettingsOptions.doorhangerGravity
        | ExtensionSettingsOptions.logLevel
        | ExtensionSettingsOptions.offlineCacheStorageBackend
        | ExtensionSettingsOptions.enableDoorhanger
        | ExtensionSettingsOptions.enablePasswordPicker
    >;

    const extensionVersion = packageJson.version;
    let extendedSettings = $state<ExtendedSettingsForm>({
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
        [ExtensionSettingsOptions.logLevel]: DEFAULT_EXTENSION_LOG_LEVEL,
        [ExtensionSettingsOptions.offlineCacheStorageBackend]: OfflineCacheStorageService.DEFAULT_BACKEND,
        [ExtensionSettingsOptions.enableDoorhanger]: true,
        [ExtensionSettingsOptions.enablePasswordPicker]: true,
    });

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
    const logLevelOptions: Record<ExtensionLogLevel, string> = {
        debug: i18n.getMessage('log_level_debug'),
        log: i18n.getMessage('log_level_log'),
        info: i18n.getMessage('log_level_info'),
        warn: i18n.getMessage('log_level_warn'),
        error: i18n.getMessage('log_level_error'),
    };
    const doorhangerLayoutItems = Object.entries(doorhangerLayoutOptions).map(([key, value]) => ({
        label: value,
        value: key,
    }));
    const doorhangerGravityItems = Object.entries(doorhangerGravityOptions).map(([key, value]) => ({
        label: value,
        value: key,
    }));
    const logLevelItems = EXTENSION_LOG_LEVELS.map((level) => ({
        label: logLevelOptions[level],
        value: level,
    }));
    const offlineCacheBackendOptions: Record<OfflineCacheStorageBackend, string> = {
        indexeddb: i18n.getMessage('offline_cache_storage_backend_indexeddb'),
        memory: i18n.getMessage('offline_cache_storage_backend_memory'),
    };
    const offlineCacheBackendItems = (Object.keys(offlineCacheBackendOptions) as OfflineCacheStorageBackend[]).map((key) => ({
        label: offlineCacheBackendOptions[key],
        value: key,
    }));
    let doorhangerLayoutSelectValue = $state({
        label: doorhangerLayoutOptions[DEFAULT_DOORHANGER_LAYOUT],
        value: DEFAULT_DOORHANGER_LAYOUT,
    });
    let doorhangerGravitySelectValue = $state({
        label: doorhangerGravityOptions[DEFAULT_DOORHANGER_GRAVITY],
        value: DEFAULT_DOORHANGER_GRAVITY,
    });
    let logLevelSelectValue = $state({
        label: logLevelOptions[DEFAULT_EXTENSION_LOG_LEVEL],
        value: DEFAULT_EXTENSION_LOG_LEVEL,
    });
    let offlineCacheBackendSelectValue = $state({
        label: offlineCacheBackendOptions[OfflineCacheStorageService.DEFAULT_BACKEND],
        value: OfflineCacheStorageService.DEFAULT_BACKEND as OfflineCacheStorageBackend,
    });

    $effect(() => {
        extendedSettings[ExtensionSettingsOptions.doorhangerLayout] = doorhangerLayoutSelectValue.value;
        extendedSettings[ExtensionSettingsOptions.doorhangerGravity] = doorhangerGravitySelectValue.value;
        extendedSettings[ExtensionSettingsOptions.logLevel] = logLevelSelectValue.value;
        extendedSettings[ExtensionSettingsOptions.offlineCacheStorageBackend] = offlineCacheBackendSelectValue.value;
    });

    let lockSaveButton = $state(false);
    let pageIsLoading = $state(true);
    let offlineCacheSize = $state<IndexedDbModelStoreSizeEstimate | null>(null);
    let offlineCacheSizeError = $state(false);
    let offlineCacheSizeLoading = $state(false);
    let clearingOfflineCache = $state(false);
    let offlineCacheEffective = $state<OfflineCacheStorageBackend>(OfflineCacheStorageService.DEFAULT_BACKEND);
    let offlineCacheForcedFallback = $state(false);
    let autoUnlockEnabled = $state(false);
    let autoUnlockUserWantsEnabled = $state(false);
    let autoUnlockBackend = $state<AutoUnlockKeyStorageBackend>("indexeddb");

    const syncOfflineCacheStatus = () => {
        offlineCacheEffective = OfflineCacheStorageService.getEffective();
        offlineCacheForcedFallback = OfflineCacheStorageService.isForcedFallback();
    };

    const setOfflineCacheBackendSelect = (backend: OfflineCacheStorageBackend) => {
        offlineCacheBackendSelectValue = {
            value: backend,
            label: offlineCacheBackendOptions[backend],
        };
        extendedSettings[ExtensionSettingsOptions.offlineCacheStorageBackend] = backend;
    };

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
            offlineCacheSize = await OfflineCachePersistenceService.estimateSize();
        } catch (e) {
            logger.error(e);
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
            await OfflineCachePersistenceService.clear();
            NotyService.notySuccess(i18n.getMessage('offline_cache_cleared_successfully'));
            await refreshOfflineCacheSize();
        } catch (e) {
            logger.error(e);
            NotyService.notyError(i18n.getMessage('offline_cache_clear_failed'));
        } finally {
            clearingOfflineCache = false;
        }
    };

    /**
     * Recreate offline model-store backends (frontend + background) and refresh size/status UI.
     * @returns false when IndexedDB was requested but unavailable (forced memory); true otherwise
     */
    const applyOfflineCacheStorageBackend = async (
        selectedBackend: OfflineCacheStorageBackend
    ): Promise<boolean> => {
        PassmanClientService.invalidatePassmanClients();
        await OfflineCachePersistenceService.recreate(selectedBackend);
        const bg = await sendMessage("recreateOfflineCachePersistence", { preferred: selectedBackend });
        syncOfflineCacheStatus();

        const effectiveMemory =
            OfflineCacheStorageService.getEffective() === "memory" || bg.effective === "memory";
        offlineCacheEffective = effectiveMemory ? "memory" : "indexeddb";
        offlineCacheForcedFallback =
            OfflineCacheStorageService.isForcedFallback() || bg.forcedFallback;
        await refreshOfflineCacheSize();

        if (selectedBackend === "indexeddb" && effectiveMemory) {
            setOfflineCacheBackendSelect("memory");
            NotyService.notyWarning(i18n.getMessage("offline_cache_indexeddb_unavailable_warning"));
            return false;
        }
        return true;
    };

    const applyAutoUnlockChange = async () => {
        if (autoUnlockUserWantsEnabled === autoUnlockEnabled) {
            return true;
        }

        const wantEnabled = autoUnlockUserWantsEnabled;
        try {
            if (wantEnabled) {
                const enabled = await ExtensionAutoUnlockService.enable();
                if (!enabled) {
                    autoUnlockEnabled = false;
                    NotyService.notyError(i18n.getMessage("auto_unlock_enable_failed"));
                    return false;
                }
                autoUnlockBackend = await ExtensionAutoUnlockService.getStorageBackend();
            } else {
                await ExtensionAutoUnlockService.disable();
            }
            return true;
        } catch (e) {
            logger.error(e);
            autoUnlockEnabled = !wantEnabled;
            NotyService.notyError(
                i18n.getMessage(wantEnabled ? "auto_unlock_enable_failed" : "auto_unlock_disable_failed")
            );
        }
        return false;
    };

    const save = async () => {
        lockSaveButton = true;
        logger.log("extendedSettings", extendedSettings);
        try {
            for (const key of Object.keys(extendedSettings)) {
                const settingId = Number(key) as keyof ExtendedSettingsForm;
                await ExtensionSettingsService.updatePartialExtensionSettings(settingId, extendedSettings[settingId]);
            }
            await ConsoleLoggingService.setLogLevel(extendedSettings[ExtensionSettingsOptions.logLevel]);

            const offlineCacheApplied = await applyOfflineCacheStorageBackend(
                offlineCacheBackendSelectValue.value as OfflineCacheStorageBackend
            );
            const autoUnlockApplied = await applyAutoUnlockChange();
            if (offlineCacheApplied && autoUnlockApplied) {
                NotyService.notySuccess(i18n.getMessage("settings_updated_successfully"));
            }
        } catch (e) {
            logger.error(e);
            NotyService.notyError(i18n.getMessage("unknown_error"));
        } finally {
            lockSaveButton = false;
        }
    };

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
                    extendedSettings[ExtensionSettingsOptions.enableDoorhanger] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enableDoorhanger)
                        ?? extendedSettings[ExtensionSettingsOptions.enableDoorhanger];
                    extendedSettings[ExtensionSettingsOptions.enablePasswordPicker] = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.enablePasswordPicker)
                        ?? extendedSettings[ExtensionSettingsOptions.enablePasswordPicker];

                    const layoutValue = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.doorhangerLayout)
                        ?? doorhangerLayoutSelectValue.value;
                    doorhangerLayoutSelectValue = {
                        value: layoutValue,
                        label: doorhangerLayoutOptions[layoutValue],
                    };
                    const gravityValue = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.doorhangerGravity)
                        ?? doorhangerGravitySelectValue.value;
                    doorhangerGravitySelectValue = {
                        value: gravityValue,
                        label: doorhangerGravityOptions[gravityValue],
                    };

                    const logLevelValue = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.logLevel)
                        ?? DEFAULT_EXTENSION_LOG_LEVEL;
                    logLevelSelectValue = {
                        value: logLevelValue,
                        label: logLevelOptions[logLevelValue],
                    };

                    const offlineCacheBackendValue = (
                        await ExtensionSettingsService.getPartialExtensionSettings(
                            ExtensionSettingsOptions.offlineCacheStorageBackend,
                            true
                        )
                    ) ?? OfflineCacheStorageService.DEFAULT_BACKEND;
                    setOfflineCacheBackendSelect(offlineCacheBackendValue);

                    await OfflineCachePersistenceService.get(offlineCacheBackendValue);
                    syncOfflineCacheStatus();
                    // Reflect forced fallback in the select if settings were auto-updated
                    setOfflineCacheBackendSelect(OfflineCacheStorageService.getPreferred());
                    await refreshOfflineCacheSize();

                    autoUnlockEnabled = await ExtensionAutoUnlockService.isEnabled();
                    autoUnlockUserWantsEnabled = autoUnlockEnabled;
                    autoUnlockBackend = await ExtensionAutoUnlockService.getStorageBackend();
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

        <ChangeUnlockPassword/>

        <CustomCheckboxField
            bind:value={autoUnlockUserWantsEnabled}
            id="enableAutoUnlock"
            label={i18n.getMessage('enable_auto_unlock')}
        />
        {#if autoUnlockUserWantsEnabled }
            <div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 ms-4">
                <p>{i18n.getMessage('enable_auto_unlock_description')}</p>
            </div>
        {/if}
        <p class="description-text">{i18n.getMessage('enable_auto_unlock_lock_note')}</p>
        {#if autoUnlockBackend === 'local'}
            <div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                <p>{i18n.getMessage('enable_auto_unlock_local_fallback_notice')}</p>
            </div>
        {/if}

        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.autofillEnabled]}
                id="enable_autofill"
                label={i18n.getMessage('enable_autofill')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling]}
                id="enableEmailAsUsernameFallbackFilling"
                label={i18n.getMessage('enable_email_as_username_fallback_filling')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableDoorhanger]}
                id="enableDoorhanger"
                label={i18n.getMessage('enable_doorhanger')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enablePasswordPicker]}
                id="enablePasswordPicker"
                label={i18n.getMessage('enable_password_picker')}/>

        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('website_credential_filter_options')}</h3>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreProtocol]}
                                id="ignoreProtocol"
                                label={i18n.getMessage('ignore_protocol')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignoreSubdomain]}
                                id="ignoreSubdomain"
                                label={i18n.getMessage('ignore_subdomain')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePath]}
                                id="ignorePath"
                                label={i18n.getMessage('ignore_path')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.ignorePort]}
                                id="ignorePort"
                                label={i18n.getMessage('ignore_port')}/>
        
        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('form_detection_settings')}</h3>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableUserEventBasedFormDetection]}
                                id="enableUserEventBasedFormDetection"
                                label={i18n.getMessage('enable_user_event_based_form_detection')}/>
        <p class="description-text">{i18n.getMessage('enable_user_event_based_form_detection_description')}</p>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents]}
                                id="enableFormDetectionOnUrlPopstateEvents"
                                label={i18n.getMessage('enable_form_detection_on_url_popstate_events')}/>
        <p class="description-text">{i18n.getMessage('enable_form_detection_on_url_popstate_events_description')}</p>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval]}
                                id="enableFormDetectionOnUrlChangesByInterval"
                                label={i18n.getMessage('enable_form_detection_on_url_changes_by_interval')}/>
        <CustomCheckboxField bind:value={extendedSettings[ExtensionSettingsOptions.enableFormDetectionByMutationObserver]}
                                id="enableFormDetectionByMutationObserver"
                                label={i18n.getMessage('enable_form_detection_by_mutation_observer')}/>
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

        <h3 class="text-lg font-semibold">{i18n.getMessage('logging_settings')}</h3>
        <p class="text-xs text-gray-500">{i18n.getMessage('logging_settings_description')}</p>
        <div class="mt-2">
            <label for="logLevel"
                   class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2">
                {i18n.getMessage('log_level')}
            </label>
            <div class="my-2">
                <Select
                    multiple={false}
                    clearable={false}
                    searchable={false}
                    showChevron={true}
                    label="label"
                    itemId="value"
                    items={logLevelItems}
                    bind:value={logLevelSelectValue}
                    id="logLevel"
                    --height="35px"
                    --font-size="14px"
                    containerStyles="height: 35px;"
                />
            </div>
        </div>

        <hr class="my-4 border-gray-200"/>

        <h3 class="text-lg font-semibold">{i18n.getMessage('offline_cache')}</h3>
        <p class="text-xs text-gray-500">{i18n.getMessage('offline_cache_description')}</p>

        <div class="mt-2">
            <label for="offlineCacheStorageBackend"
                   class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text block mb-2">
                {i18n.getMessage('offline_cache_storage_backend')}
            </label>
            <div class="my-2">
                <Select
                    multiple={false}
                    clearable={false}
                    searchable={false}
                    showChevron={true}
                    label="label"
                    itemId="value"
                    items={offlineCacheBackendItems}
                    bind:value={offlineCacheBackendSelectValue}
                    id="offlineCacheStorageBackend"
                    --height="35px"
                    --font-size="14px"
                    containerStyles="height: 35px;"
                />
            </div>
            <p class="description-text pl-0!">{i18n.getMessage('offline_cache_storage_backend_description')}</p>
        </div>

        {#if offlineCacheEffective === 'memory'}
            <div class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                {#if offlineCacheForcedFallback}
                    <p>{i18n.getMessage('offline_cache_forced_fallback_notice')}</p>
                {:else}
                    <p>{i18n.getMessage('offline_cache_memory_mode_notice')}</p>
                {/if}
                <p class="text-xs leading-relaxed text-amber-800 mt-1">
                    * {i18n.getMessage('experimental')}
                </p>
            </div>
        {/if}

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
            {#if offlineCacheEffective === 'memory'}
                <p class="text-xs text-gray-500">{i18n.getMessage('offline_cache_size_memory_note')}</p>
            {/if}
        {/if}
        <OnClickButton
            callback={clearOfflineCache}
            disabled={clearingOfflineCache}
            additionalClasses="border-red-300 text-red-600"
        >
            {#if clearingOfflineCache}
                <Icon data={refresh} scale={1.3} spin={true}/>
            {:else}
                {i18n.getMessage('clear_offline_cache')}
            {/if}
        </OnClickButton>
    </Card>

    <OnClickButton callback={save}>
        {#if lockSaveButton}
            <Icon data={refresh} scale={1.3} spin={true}/>
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
