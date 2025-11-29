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
     * The original extension settings that are allowed to be overwritten by the page rules.
     */
    originalOverwritableExtensionSettings: Omit<PageRulesInterface, 'ignorePage' | 'enableAutosubmit'>;

    /**
     * The page rules that are merged with the global extension settings (that are allowed to be transferred to the content script).
     * Ready to be just applied within the content script.
     */
    mergedPageRules: PageRulesInterface;
}

// todo: can we assumt the pageUrl from brwoser magic, or do we need to pass it as a parameter?
onMessage('getPickerPageSettings', async (request) => {
    const extensionSettings = await ExtensionSettingsService.getExtensionSettings();
    let urlOrigin = request.sender.url;
    if (Object.hasOwn(request.sender, 'origin') && (request.sender as any).origin !== undefined) {
        // https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender
        // @ts-expect-error - origin exists in the chrome runtime, but does not exist in the firefox runtime nor in the webextension-polyfill type definitions
        urlOrigin = request.sender.origin;
    } else if (urlOrigin) {
        urlOrigin = new URL(urlOrigin).origin;
    }
    
    if (!urlOrigin) {
        throw new Error('No url origin found');
    }

    const originalPageRules = await PageRulesService.getPageRules(urlOrigin);
    const pageRulesWithoutUndefinedKeys: Partial<PageRulesInterface> = Object.fromEntries(Object.entries(originalPageRules).filter(([key, value]) => value !== undefined));
    const originalOverwritableExtensionSettings = {
        ignoreProtocol: extensionSettings[ExtensionSettingsOptions.ignoreProtocol],
        ignoreSubdomain: extensionSettings[ExtensionSettingsOptions.ignoreSubdomain],
        ignorePath: extensionSettings[ExtensionSettingsOptions.ignorePath],
        ignorePort: extensionSettings[ExtensionSettingsOptions.ignorePort],
        autofillEnabled: extensionSettings[ExtensionSettingsOptions.autofillEnabled],
        enableEmailAsUsernameFallbackFilling: extensionSettings[ExtensionSettingsOptions.enableEmailAsUsernameFallbackFilling],
        enableUserEventBasedFormDetection: extensionSettings[ExtensionSettingsOptions.enableUserEventBasedFormDetection],
        enableFormDetectionOnUrlPopstateEvents: extensionSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlPopstateEvents],
        enableFormDetectionOnUrlChangesByInterval: extensionSettings[ExtensionSettingsOptions.enableFormDetectionOnUrlChangesByInterval],
        enableFormDetectionByMutationObserver: extensionSettings[ExtensionSettingsOptions.enableFormDetectionByMutationObserver],
    };

    /**
     * How mergedPageRules work:
     * 1. Start with the original page rules to ensure all keys are present
     * 2. Add the global extension settings that override some of the original page rules
     * 3. Since we actually want to override the global settings with the page rules, add them again, but without undefined keys, so we use the globals there
     */
    return {
        originalPageRules: originalPageRules,
        originalOverwritableExtensionSettings,
        mergedPageRules: {
            ...originalPageRules,
            ...originalOverwritableExtensionSettings,
            ...pageRulesWithoutUndefinedKeys,
        },
    };
});
