import { onMessage } from "@/entrypoints/background/messaging";
import PageRulesService, { PageRulesInterface } from "@/services/PageRulesService";

export interface UpdatePickerPageSettingsRequest {
    /**
     * The page rules to update for the current page.
     */
    updatedPageRules: Partial<PageRulesInterfaceWithTransferableInitialState>;
}

// Compose the type
export type PageRulesInterfaceWithTransferableInitialState = PageRulesInterface & {
    [K in keyof PageRulesInterface]: PageRulesInterface[K] | 'inherit';
};

// todo: can we assumt the pageUrl from brwoser magic, or do we need to pass it as a parameter?
onMessage('updatePickerPageSettings', async (request) => {
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

    await PageRulesService.setPageRules(
        urlOrigin,
        Object.fromEntries(Object.entries(request.data.updatedPageRules).map(
            // @ts-expect-error - value is a boolean or string, defined in the PageRulesInterfaceWithTransferableInitialState type
            ([key, value]) => [key, value === 'inherit' ? undefined : value]
        ))
    );
});
