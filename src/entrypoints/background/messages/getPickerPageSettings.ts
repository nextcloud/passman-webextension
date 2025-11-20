import ExtensionSettingsService, {
    ExtensionSettingsOptions
} from "~/services/ExtensionSettingsService";
import { onMessage } from "@/entrypoints/background/messaging";
import PageRulesService, { PageRulesInterface } from "@/services/PageRulesService";

export interface GetPickerPageSettingsResponse {
    /**
     * The page rules that are set for the current page.
     */
    originalPageRules: PageRulesInterface;

    /**
     * The page rules that are merged with the global extension settings (that are allowed to be transferred to the content script).
     * Ready to be just applied within the content script.
     */
    mergedPageRules: PageRulesInterface;
}

// todo: can we assumt the pageUrl from brwoser magic, or do we need to pass it as a parameter?
onMessage('getPickerPageSettings', async () => {
    const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
    const originalPageRules = await PageRulesService.getPageRules(window.location.href);
    const pageRulesWithoutUndefinedKeys: Partial<PageRulesInterface> = Object.fromEntries(Object.entries(originalPageRules).filter(([key, value]) => value !== undefined));

    /**
     * How mergedPageRules work:
     * 1. Start with the original page rules to ensure all keys are present
     * 2. Add the global extension settings that override some of the original page rules
     * 3. Since we actually want to override the global settings with the page rules, add them again, but without undefined keys, so we use the globals there
     */
    return {
        originalPageRules: originalPageRules,
        mergedPageRules: {
            ...originalPageRules,
            ...{
                ignoreProtocol: extensionSettings[ExtensionSettingsOptions.ignoreProtocol],
                ignoreSubdomain: extensionSettings[ExtensionSettingsOptions.ignoreSubdomain],
                ignorePath: extensionSettings[ExtensionSettingsOptions.ignorePath],
                ignorePort: extensionSettings[ExtensionSettingsOptions.ignorePort],
                autofillEnabled: extensionSettings[ExtensionSettingsOptions.autofillEnabled],
                enableEmailAsUsernameFallbackFilling: extensionSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling],
            },
            ...pageRulesWithoutUndefinedKeys,
        },
    };
});
