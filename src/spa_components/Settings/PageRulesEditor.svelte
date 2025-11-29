<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import { i18n } from "~/lib/i18n";
    import PageRulesService, { type PageRulesInterface } from "~/services/PageRulesService";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import {
        PAGE_RULE_OVERRIDE_FIELDS,
        type PageRuleOverrideKey,
        type PageRuleOverrideSelection,
        buildOverrideSelectValuesFromRule,
        pageRuleOverrideSelectionToBoolean
    } from "~/lib/pageRules/pageRulesOverrides";

    const dispatch = createEventDispatcher<{
        save: { initialUrl: string, url: string, rule: PageRulesInterface },
        cancel: void,
        delete: { initialUrl: string }
    }>();

    export let mode: 'create' | 'edit' = 'create';
    export let initialUrl: string = '';
    export let initialRule: PageRulesInterface = PageRulesService.getFreshPageRules();
    export let isSaving: boolean = false;
    export let isDeleting: boolean = false;

    let formUrl: string = initialUrl;
    let formRule: PageRulesInterface = {
        ...initialRule
    };

    let overrideSelectValues: Record<PageRuleOverrideKey, PageRuleOverrideSelection> = buildOverrideSelectValuesFromRule(formRule);

    let previousInitialRule: PageRulesInterface | null = null;
    let previousInitialUrl: string = initialUrl;

    const syncOverrideSelectValuesFromRule = (rule: PageRulesInterface) => {
        overrideSelectValues = buildOverrideSelectValuesFromRule(rule);
    };

    onMount(() => {
        syncOverrideSelectValuesFromRule(formRule);
    });

    $: if (initialRule !== previousInitialRule) {
        formRule = {
            ...PageRulesService.getFreshPageRules(),
            ...initialRule
        };
        syncOverrideSelectValuesFromRule(formRule);
        previousInitialRule = initialRule;
    }

    $: if (initialUrl !== previousInitialUrl) {
        formUrl = initialUrl;
        previousInitialUrl = initialUrl;
    }

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

    const save = () => {
        dispatch('save', {
            initialUrl: initialUrl,
            url: formUrl,
            rule: { ...formRule }
        });
    };

    const cancel = () => {
        dispatch('cancel');
    };

    const deleteRule = () => {
        dispatch('delete', {
            initialUrl: initialUrl
        });
    };

    const getGlobalValueState = async (key: PageRuleOverrideKey): Promise<string> => {
        const value = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions[key]);
        return value ? i18n.getMessage('page_rules_global_value_enabled') : i18n.getMessage('page_rules_global_value_disabled');
    };

    const fixFormUrlToOrigin = () => {
        if (formUrl.trim() === '') {
            return;
        }
        formUrl = PageRulesService.urlToOrigin(formUrl);
    };

    const formUrlIsValid = () => {
        try {
            return formUrl.trim() !== '' && !formUrl.includes('://') && PageRulesService.urlToOrigin(formUrl) === formUrl;
        } catch (error) {
            console.debug('Failed to validate form url', error);
            return false;
        }
        return false;
    };
</script>

<div class="space-y-5">
    <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base font-semibold">
            {mode === 'edit'
                ? i18n.getMessage('page_rules_update_rule')
                : i18n.getMessage('page_rules_new_rule')}
        </h3>
        {#if mode === 'edit' && initialUrl}
            <span class="text-xs text-gray-500">
                {i18n.getMessage('page_rules_selected_rule', initialUrl)}
            </span>
        {/if}
    </div>

    <div>
        <CustomInputField
                label="{i18n.getMessage('page_rules_url_label')}"
                placeholder="{i18n.getMessage('page_rules_url_placeholder')}"
                bind:value={formUrl}
                onchange={fixFormUrlToOrigin}
        />
    </div>

    <div class="grid gap-4 md:grid-cols-2">
        <CustomCheckboxField
                bind:value={formRule.ignorePage}
                id="ignorePage"
                label="{i18n.getMessage('ignore_page')}"
        />
        <CustomCheckboxField
                bind:value={formRule.enableAutosubmit}
                id="enableAutosubmit"
                label="{i18n.getMessage('enable_autosubmit')}"
        />
    </div>

    <hr class="my-4 border-gray-200"/>

    <div class="space-y-3">
        <p class="text-sm font-semibold">{i18n.getMessage('page_rules_override_section')}</p>
        <div class="grid gap-4 md:grid-cols-2">
            {#each PAGE_RULE_OVERRIDE_FIELDS as field}
                <div class="flex flex-col space-y-1">
                    <label for={`override-${field.key}`} class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text">
                        {i18n.getMessage(field.labelKey)}
                    </label>
                    <select
                            id={`override-${field.key}`}
                            class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-1.5
                             focus:ring-cyan-600 focus:border-cyan-600 dark:bg-neutral dark:text-primary-dark-text"
                            value={overrideSelectValues[field.key]}
                            on:change={(event) => handleOverrideChange(field.key, (event.currentTarget as HTMLSelectElement).value as PageRuleOverrideSelection)}
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

    <div class="flex flex-wrap gap-3">
        <OnClickButton
                callback={save}
                disabled={isSaving || !formUrl.trim() || !formUrlIsValid()}
        >
            {#if isSaving}
                <Icon data={refresh} scale={1.0} spin="{true}"/>
            {:else if mode === 'edit'}
                {i18n.getMessage('page_rules_update_rule')}
            {:else}
                {i18n.getMessage('page_rules_save_rule')}
            {/if}
        </OnClickButton>

        <OnClickButton
                callback={cancel}
                additionalClasses="border-gray-300 text-gray-600"
        >
            {i18n.getMessage('page_rules_cancel_edit')}
        </OnClickButton>

        {#if mode === 'edit'}
            <OnClickButton
                    callback={deleteRule}
                    disabled={isDeleting}
                    additionalClasses="border-red-300 text-red-600"
            >
                {#if isDeleting}
                    <Icon data={refresh} scale={1.0} spin="{true}"/>
                {:else}
                    {i18n.getMessage('page_rules_delete_rule')}
                {/if}
            </OnClickButton>
        {/if}
    </div>
</div>
