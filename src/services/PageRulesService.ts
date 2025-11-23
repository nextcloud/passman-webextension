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
    enableUserEventBasedFormDetection? : EventuallyPageRulesState<boolean>,
    enableFormDetectionOnUrlPopstateEvents? : EventuallyPageRulesState<boolean>,
    enableFormDetectionOnUrlChangesByInterval? : EventuallyPageRulesState<boolean>,
    enableFormDetectionByMutationObserver? : EventuallyPageRulesState<boolean>,
}

/**
 * This service is used to get and set page rules for the current page.
 * Todo: due to challenges in cache sync between frontend and background scripts, we currently do not use a cache. Fix that in future!
 */
export default class PageRulesService {
    private static pageRulesCache: PageRulesStorageInterface | null = null;

    public static getFreshPageRules = (): PageRulesInterface => {
        return {
            ignorePage: false,
            enableAutosubmit: false,
        };
    }

    public static getAllPageRules = async () => {
        /*if (!PageRulesService.pageRulesCache) {
            PageRulesService.pageRulesCache = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.pageRules) ?? {};
        }
        return PageRulesService.pageRulesCache;*/
        return await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.pageRules) ?? {};
    }

    /**
     * @param pageUrl The page URL to get the page rules for.
     * @returns The page rules for the given page URL or the default page rules if no page rules are set for the given page URL.
     */
    public static getPageRules = async (pageUrl: string) => {
        const pageRules = await PageRulesService.getAllPageRules();
        return pageRules[PageRulesService.urlToOrigin(pageUrl)] ?? this.getFreshPageRules();
    }

    public static setPageRules = async (pageUrl: string, updatePageRules: Partial<PageRulesInterface>) => {
        const originUrl = PageRulesService.urlToOrigin(pageUrl);
        const pageRules = await PageRulesService.getAllPageRules();
        pageRules[originUrl] = { ...await this.getPageRules(originUrl), ...updatePageRules };
        // is this necessary? it SHOULD be a object reference, not a copy of the object
        // PageRulesService.pageRulesCache = pageRules;
        await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.pageRules, pageRules);
    }

    public static deletePageRules = async (pageUrl: string) => {
        const originUrl = PageRulesService.urlToOrigin(pageUrl);
        const pageRules = await PageRulesService.getAllPageRules();
        if (pageRules[originUrl] === undefined) {
            return;
        }
        delete pageRules[originUrl];
        // PageRulesService.pageRulesCache = pageRules;
        await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.pageRules, pageRules);
    }

    /**
     * Convert input url to origin url without protocol prefix
     */
    public static urlToOrigin = (url: string) => {
        // unfortunatly we need to add the protocol prefix, because the URL constructor expects a full url
        return new URL('https://' + (url.split('://')[1] ?? url)).origin.split('://')[1];
    }
}
