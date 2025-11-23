<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import { i18n } from "~/lib/i18n";
    import PageRulesService, { type PageRulesInterface } from "~/services/PageRulesService";

    type OverrideKey = keyof Pick<PageRulesInterface,
        'ignoreProtocol' |
        'ignoreSubdomain' |
        'ignorePath' |
        'ignorePort' |
        'autofillEnabled' |
        'enableEmailAsUsernameFallbackFilling' |
        'enableUserEventBasedFormDetection' |
        'enableFormDetectionOnUrlPopstateEvents' |
        'enableFormDetectionOnUrlChangesByInterval' |
        'enableFormDetectionByMutationObserver'
    >;

    type OverrideSelectionValue = 'inherit' | 'true' | 'false';

    const overrideFieldDefinitions: { key: OverrideKey, labelKey: string }[] = [
        { key: 'ignoreProtocol', labelKey: 'ignore_protocol' },
        { key: 'ignoreSubdomain', labelKey: 'ignore_subdomain' },
        { key: 'ignorePath', labelKey: 'ignore_path' },
        { key: 'ignorePort', labelKey: 'ignore_port' },
        { key: 'autofillEnabled', labelKey: 'enable_autofill' },
        {
            key: 'enableEmailAsUsernameFallbackFilling',
            labelKey: 'enable_email_as_username_fallback_filling'
        },
        {
            key: 'enableUserEventBasedFormDetection',
            labelKey: 'enable_user_event_based_form_detection'
        },
        {
            key: 'enableFormDetectionOnUrlPopstateEvents',
            labelKey: 'enable_form_detection_on_url_popstate_events'
        },
        {
            key: 'enableFormDetectionOnUrlChangesByInterval',
            labelKey: 'enable_form_detection_on_url_changes_by_interval'
        },
        {
            key: 'enableFormDetectionByMutationObserver',
            labelKey: 'enable_form_detection_by_mutation_observer'
        }
    ];

    const dispatch = createEventDispatcher<{
        save: { url: string, rule: PageRulesInterface },
        cancel: void,
        delete: void
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

    let overrideSelectValues: Record<OverrideKey, OverrideSelectionValue> = {
        ignoreProtocol: 'inherit',
        ignoreSubdomain: 'inherit',
        ignorePath: 'inherit',
        ignorePort: 'inherit',
        autofillEnabled: 'inherit',
        enableEmailAsUsernameFallbackFilling: 'inherit',
        enableUserEventBasedFormDetection: 'inherit',
        enableFormDetectionOnUrlPopstateEvents: 'inherit',
        enableFormDetectionOnUrlChangesByInterval: 'inherit',
        enableFormDetectionByMutationObserver: 'inherit'
    };

    let previousInitialRule: PageRulesInterface | null = null;
    let previousInitialUrl: string = initialUrl;

    const booleanToSelectValue = (value: boolean | undefined): OverrideSelectionValue => {
        if (value === undefined) {
            return 'inherit';
        }
        return value ? 'true' : 'false';
    };

    const selectValueToBoolean = (value: OverrideSelectionValue): boolean | undefined => {
        if (value === 'inherit') {
            return undefined;
        }
        return value === 'true';
    };

    const syncOverrideSelectValuesFromRule = (rule: PageRulesInterface) => {
        overrideSelectValues = {
            ignoreProtocol: booleanToSelectValue(rule.ignoreProtocol),
            ignoreSubdomain: booleanToSelectValue(rule.ignoreSubdomain),
            ignorePath: booleanToSelectValue(rule.ignorePath),
            ignorePort: booleanToSelectValue(rule.ignorePort),
            autofillEnabled: booleanToSelectValue(rule.autofillEnabled),
            enableEmailAsUsernameFallbackFilling: booleanToSelectValue(rule.enableEmailAsUsernameFallbackFilling),
            enableUserEventBasedFormDetection: booleanToSelectValue(rule.enableUserEventBasedFormDetection),
            enableFormDetectionOnUrlPopstateEvents: booleanToSelectValue(rule.enableFormDetectionOnUrlPopstateEvents),
            enableFormDetectionOnUrlChangesByInterval: booleanToSelectValue(rule.enableFormDetectionOnUrlChangesByInterval),
            enableFormDetectionByMutationObserver: booleanToSelectValue(rule.enableFormDetectionByMutationObserver)
        };
    };

    syncOverrideSelectValuesFromRule(formRule);

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

    const handleOverrideChange = (key: OverrideKey, selection: OverrideSelectionValue) => {
        formRule = {
            ...formRule,
            [key]: selectValueToBoolean(selection)
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

    <div class="space-y-3">
        <p class="text-sm font-semibold">{i18n.getMessage('page_rules_override_section')}</p>
        <div class="grid gap-4 md:grid-cols-2">
            {#each overrideFieldDefinitions as field}
                <div class="flex flex-col space-y-1">
                    <label for={`override-${field.key}`} class="text-sm font-medium text-primary-light-text dark:text-primary-dark-text">
                        {i18n.getMessage(field.labelKey)}
                    </label>
                    <select
                            id={`override-${field.key}`}
                            class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-2.5
                             focus:ring-cyan-600 focus:border-cyan-600 dark:bg-neutral dark:text-primary-dark-text"
                            bind:value={overrideSelectValues[field.key]}
                            on:change={(event) => handleOverrideChange(field.key, (event.currentTarget as HTMLSelectElement).value as OverrideSelectionValue)}
                    >
                        <option value="inherit">{i18n.getMessage('page_rules_use_global')}</option>
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
                disabled={isSaving || !formUrl.trim()}
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
