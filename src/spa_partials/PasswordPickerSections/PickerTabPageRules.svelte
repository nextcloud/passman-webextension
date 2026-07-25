<script lang="ts">
    import { onMount } from "svelte";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import PageRulesService, { type PageRulesInterface } from "~/services/PageRulesService";
    import { i18n } from "~/lib/i18n";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import type { GetPickerPageSettingsResponse } from "@/entrypoints/background/messages/getPickerPageSettings";
    import type { UpdatePickerPageSettingsRequest } from "@/entrypoints/background/messages/updatePickerPageSettings";
    import {
        PAGE_RULE_ALL_KEYS,
        PAGE_RULE_OVERRIDE_FIELDS,
        type PageRuleOverrideKey,
        type PageRuleOverrideSelection,
        buildOverrideSelectValuesFromRule,
        pageRuleOverrideBooleanToSelection,
        pageRuleOverrideSelectionToBoolean,
    } from "~/lib/pageRules/pageRulesOverrides";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import { logger } from "~/services/ConsoleLoggingService";

    let currentOrigin = $state('');
    let isLoading = $state(true);
    let loadError = $state<string | null>(null);
    let isSaving = $state(false);
    let saveError = $state<string | null>(null);

    let originalPageRules = $state<PageRulesInterface>(PageRulesService.getFreshPageRules());
    let originalOverwritableExtensionSettings = $state<Omit<PageRulesInterface, 'ignorePage' | 'enableAutosubmit'> | undefined>(undefined);
    let formRule = $state<PageRulesInterface>(PageRulesService.getFreshPageRules());

    let overrideSelectValues = $state<Record<PageRuleOverrideKey, PageRuleOverrideSelection>>(
        buildOverrideSelectValuesFromRule(PageRulesService.getFreshPageRules())
    );

    const syncOverrideSelectValuesFromRule = (rule: PageRulesInterface) => {
        overrideSelectValues = buildOverrideSelectValuesFromRule(rule);
    };

    const rulesAreEqual = (a: PageRulesInterface, b: PageRulesInterface) => {
        return PAGE_RULE_ALL_KEYS.every((key) => (a[key] ?? undefined) === (b[key] ?? undefined));
    };

    const hasUnsavedChanges = $derived(!rulesAreEqual(formRule, originalPageRules));

    const handleOverrideChange = (key: PageRuleOverrideKey, selection: PageRuleOverrideSelection) => {
        formRule = {
            ...formRule,
            [key]: pageRuleOverrideSelectionToBoolean(selection)
        };
        overrideSelectValues = {
            ...overrideSelectValues,
            [key]: selection
        };
    };

    const formRuleToUpdatePayload = (rule: PageRulesInterface): UpdatePickerPageSettingsRequest['updatedPageRules'] => {
        const payload: UpdatePickerPageSettingsRequest['updatedPageRules'] = {
            ignorePage: rule.ignorePage ? 'true' : 'false',
            enableAutosubmit: rule.enableAutosubmit ? 'true' : 'false',
        };
        for (const field of PAGE_RULE_OVERRIDE_FIELDS) {
            payload[field.key] = pageRuleOverrideBooleanToSelection(rule[field.key]);
        }
        return payload;
    };

    const resetChanges = () => {
        formRule = { ...originalPageRules };
        syncOverrideSelectValuesFromRule(formRule);
        saveError = null;
    };

    const getOverrideSelectId = (key: PageRuleOverrideKey) => `picker-override-${key}`;

    const loadPageRules = async () => {
        isLoading = true;
        loadError = null;
        saveError = null;
        try {
            currentOrigin = PageRulesService.urlToOrigin(window.location.href);
        } catch (error) {
            logger.warn('Failed to detect current origin', error);
            currentOrigin = window.location.hostname;
        }
        try {
            const response = await sendMessage('getPickerPageSettings') as GetPickerPageSettingsResponse;
            originalPageRules = {
                ...PageRulesService.getFreshPageRules(),
                ...response.originalPageRules
            };
            formRule = { ...originalPageRules };
            syncOverrideSelectValuesFromRule(formRule);
            originalOverwritableExtensionSettings = response.originalOverwritableExtensionSettings;
        } catch (error) {
            logger.error('Failed to load picker page rules', error);
            loadError = i18n.getMessage('page_rules_picker_load_error');
        } finally {
            isLoading = false;
        }
    };

    const saveChanges = async () => {
        if (!hasUnsavedChanges || isSaving) {
            return;
        }
        isSaving = true;
        saveError = null;
        try {
            await sendMessage('updatePickerPageSettings', { updatedPageRules: formRuleToUpdatePayload(formRule) });
            logger.debug('Page rules updated for', currentOrigin);
            originalPageRules = { ...formRule };
        } catch (error) {
            logger.error('Failed to save picker page rules', error);
            saveError = i18n.getMessage('page_rules_picker_save_error');
        } finally {
            isSaving = false;
        }
    };

    const getGlobalValueState = async (key: PageRuleOverrideKey): Promise<string> => {
        return originalOverwritableExtensionSettings?.[key] ? i18n.getMessage('page_rules_global_value_enabled') : i18n.getMessage('page_rules_global_value_disabled');
    };

    onMount(() => {
        loadPageRules();
    });
</script>

<div class="tab-page-rules space-y-3 text-sm">
    <div>
        <p class="text-[11px] uppercase tracking-wide text-gray-500">
            {i18n.getMessage("page_rules")} | {i18n.getMessage('page_rules_picker_current_site')}
        </p>
        <p class="font-semibold break-all">{currentOrigin}</p>
    </div>

    {#if isLoading}
        <p class="text-xs text-gray-500">{i18n.getMessage('page_rules_picker_loading')}</p>
    {:else if loadError}
        <div class="space-y-2">
            <p class="text-xs text-red-500">{loadError}</p>
            <button
                    class="text-xs underline text-gray-500 hover:text-gray-300"
                    type="button"
                    onclick={loadPageRules}
            >
                {i18n.getMessage('page_rules_picker_retry')}
            </button>
        </div>
    {:else}
        <div class="space-y-3">
            <p class="text-xs text-gray-500">
                {i18n.getMessage('page_rules_picker_intro')}
            </p>

            <div class="grid gap-3">
                <CustomCheckboxField
                        bind:value={formRule.ignorePage}
                        id="picker-ignorePage"
                        label={i18n.getMessage('ignore_page')}
                />
                <CustomCheckboxField
                        bind:value={formRule.enableAutosubmit}
                        id="picker-enableAutosubmit"
                        label={i18n.getMessage('enable_autosubmit')}
                />
            </div>

            <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {i18n.getMessage('page_rules_override_section')}
                </p>
                <div class="grid gap-3">
                    {#each PAGE_RULE_OVERRIDE_FIELDS.filter(field => field.group !== 'formDetection') as field}
                        <div class="flex flex-col space-y-1">
                            <label for={getOverrideSelectId(field.key)} class="text-xs font-medium text-primary-light-text dark:text-primary-dark-text">
                                {i18n.getMessage(field.labelKey)}
                            </label>
                            <select
                                    id={getOverrideSelectId(field.key)}
                                    class="rounded border border-gray-300 bg-white p-1 text-xs focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary-focus dark:bg-neutral dark:text-primary-dark-text"
                                    bind:value={overrideSelectValues[field.key]}
                                    onchange={(event) => handleOverrideChange(field.key, (event.currentTarget as HTMLSelectElement).value as PageRuleOverrideSelection)}
                            >
                                <option value="inherit">
                                    {i18n.getMessage('page_rules_use_global')} {#await getGlobalValueState(field.key) then state}({state}){/await}
                                </option>
                                <option value="true">{i18n.getMessage('page_rules_force_enable')}</option>
                                <option value="false">{i18n.getMessage('page_rules_force_disable')}</option>
                            </select>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {i18n.getMessage('form_detection_settings')}
                </p>
                <div class="grid gap-3">
                    {#each PAGE_RULE_OVERRIDE_FIELDS.filter(field => field.group === 'formDetection') as field (field.key)}
                        <div class="flex flex-col space-y-1">
                            <label for={getOverrideSelectId(field.key)} class="text-xs font-medium text-primary-light-text dark:text-primary-dark-text">
                                {i18n.getMessage(field.labelKey)}
                            </label>
                            <select
                                    id={getOverrideSelectId(field.key)}
                                    class="rounded border border-gray-300 bg-white p-1 text-xs focus:border-primary-focus focus:outline-none focus:ring-1 focus:ring-primary-focus dark:bg-neutral dark:text-primary-dark-text"
                                    bind:value={overrideSelectValues[field.key]}
                                    onchange={(event) => handleOverrideChange(field.key, (event.currentTarget as HTMLSelectElement).value as PageRuleOverrideSelection)}
                            >
                                <option value="inherit">
                                    {i18n.getMessage('page_rules_use_global')} {#await getGlobalValueState(field.key) then state}({state}){/await}
                                </option>
                                <option value="true">{i18n.getMessage('page_rules_force_enable')}</option>
                                <option value="false">{i18n.getMessage('page_rules_force_disable')}</option>
                            </select>
                            {#if field.descriptionKey}
                                <p class="text-[11px] text-gray-500">
                                    {i18n.getMessage(field.descriptionKey)}
                                </p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            {#if saveError}
                <p class="text-xs text-red-500">{saveError}</p>
            {/if}


            <OnClickButton callback={saveChanges} disabled={!hasUnsavedChanges || isSaving}
                additionalClasses="bg-green-600 hover:bg-green-500 text-white disabled:opacity-60 disabled:bg-gray-200">
                {#if isSaving}
                    {i18n.getMessage('saving')}
                {:else}
                    {i18n.getMessage('page_rules_update_rule')}
                {/if}
            </OnClickButton>

            <OnClickButton callback={resetChanges} disabled={!hasUnsavedChanges || isLoading}
                additionalClasses="bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-60 disabled:text-gray-400">
                {i18n.getMessage('page_rules_picker_reset')}
            </OnClickButton>
        </div>
    {/if}
</div>
