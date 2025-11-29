import type { PageRulesInterface } from "~/services/PageRulesService";

export type PageRuleOverrideKey = keyof Pick<PageRulesInterface,
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

export type PageRuleOverrideSelection = 'inherit' | 'true' | 'false';

export interface PageRuleOverrideFieldDefinition {
    key: PageRuleOverrideKey;
    labelKey: string;
    descriptionKey?: string;
    group?: 'formDetection';
}

export const PAGE_RULE_OVERRIDE_FIELDS: PageRuleOverrideFieldDefinition[] = [
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
        labelKey: 'enable_user_event_based_form_detection',
        descriptionKey: 'enable_user_event_based_form_detection_description',
        group: 'formDetection'
    },
    {
        key: 'enableFormDetectionOnUrlPopstateEvents',
        labelKey: 'enable_form_detection_on_url_popstate_events',
        descriptionKey: 'enable_form_detection_on_url_popstate_events_description',
        group: 'formDetection'
    },
    {
        key: 'enableFormDetectionOnUrlChangesByInterval',
        labelKey: 'enable_form_detection_on_url_changes_by_interval',
        group: 'formDetection'
    },
    {
        key: 'enableFormDetectionByMutationObserver',
        labelKey: 'enable_form_detection_by_mutation_observer',
        descriptionKey: 'enable_form_detection_by_mutation_observer_description',
        group: 'formDetection'
    }
];

export const DEFAULT_OVERRIDE_SELECT_VALUES: Record<PageRuleOverrideKey, PageRuleOverrideSelection> = {
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

export const pageRuleOverrideBooleanToSelection = (value: boolean | undefined): PageRuleOverrideSelection => {
    if (value === undefined) {
        return 'inherit';
    }
    return value ? 'true' : 'false';
};

export const pageRuleOverrideSelectionToBoolean = (value: PageRuleOverrideSelection): boolean | undefined => {
    if (value === 'inherit') {
        return undefined;
    }
    return value === 'true';
};

export const buildOverrideSelectValuesFromRule = (rule: PageRulesInterface): Record<PageRuleOverrideKey, PageRuleOverrideSelection> => ({
    ignoreProtocol: pageRuleOverrideBooleanToSelection(rule.ignoreProtocol),
    ignoreSubdomain: pageRuleOverrideBooleanToSelection(rule.ignoreSubdomain),
    ignorePath: pageRuleOverrideBooleanToSelection(rule.ignorePath),
    ignorePort: pageRuleOverrideBooleanToSelection(rule.ignorePort),
    autofillEnabled: pageRuleOverrideBooleanToSelection(rule.autofillEnabled),
    enableEmailAsUsernameFallbackFilling: pageRuleOverrideBooleanToSelection(rule.enableEmailAsUsernameFallbackFilling),
    enableUserEventBasedFormDetection: pageRuleOverrideBooleanToSelection(rule.enableUserEventBasedFormDetection),
    enableFormDetectionOnUrlPopstateEvents: pageRuleOverrideBooleanToSelection(rule.enableFormDetectionOnUrlPopstateEvents),
    enableFormDetectionOnUrlChangesByInterval: pageRuleOverrideBooleanToSelection(rule.enableFormDetectionOnUrlChangesByInterval),
    enableFormDetectionByMutationObserver: pageRuleOverrideBooleanToSelection(rule.enableFormDetectionByMutationObserver)
});

export const PAGE_RULE_ALL_KEYS: (keyof PageRulesInterface)[] = [
    'ignorePage',
    'enableAutosubmit',
    ...PAGE_RULE_OVERRIDE_FIELDS.map((field) => field.key)
];

