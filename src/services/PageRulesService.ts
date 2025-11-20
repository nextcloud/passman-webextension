import ExtensionSettingsService, { ExtensionSettingsOptions } from "./ExtensionSettingsService";

export interface PageRulesStorageInterface {
    [pageUrl: string]: PageRulesInterface;
}

/**
 * A {n}-state value that can be T or undefined.
 * undefined means that the rule is not set (assume global or default value instead)
 */
export type EventuallyPageRulesState<T> = T | undefined;

export interface PageRulesInterface {
    // custom page specific settings (default is obviously the opposite of the boolisch key name)
    ignorePage: boolean;
    enableAutosubmit: boolean;

    // overrides for global extension settings
    ignoreProtocol?: EventuallyPageRulesState<boolean>,
    ignoreSubdomain?: EventuallyPageRulesState<boolean>,
    ignorePath?: EventuallyPageRulesState<boolean>,
    ignorePort?: EventuallyPageRulesState<boolean>,
    autofillEnabled?: EventuallyPageRulesState<boolean>,
    enableEmailAsUsernameFallbackFilling?: EventuallyPageRulesState<boolean>,
}

export default class PageRulesService {
    private static pageRulesCache: PageRulesStorageInterface | null = null;

    protected static getFreshPageRules = (): PageRulesInterface => {
        return {
            ignorePage: false,
            enableAutosubmit: false,
        };
    }

    public static getAllPageRules = async () => {
        if (!PageRulesService.pageRulesCache) {
            PageRulesService.pageRulesCache = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.pageRules) ?? {};
        }
        return PageRulesService.pageRulesCache;
    }

    /**
     * @param pageUrl The page URL to get the page rules for.
     * @returns The page rules for the given page URL or the default page rules if no page rules are set for the given page URL.
     */
    public static getPageRules = async (pageUrl: string) => {
        const pageRules = await PageRulesService.getAllPageRules();
        return pageRules[pageUrl] ?? this.getFreshPageRules();
    }

    public static setPageRules = async (pageUrl: string, updatePageRules: Partial<PageRulesInterface>) => {
        const pageRules = await PageRulesService.getAllPageRules();
        pageRules[pageUrl] = { ...await this.getPageRules(pageUrl), ...updatePageRules };
        // is this necessary? it SHOULD be a object reference, not a copy of the object
        PageRulesService.pageRulesCache = pageRules;
        await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.pageRules, pageRules);
    }
}
