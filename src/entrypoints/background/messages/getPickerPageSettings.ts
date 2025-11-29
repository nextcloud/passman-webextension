import { onMessage } from "@/entrypoints/background/messaging";
import PageRulesService, { type CombinedSettingsResponse } from "@/services/PageRulesService";

export type GetPickerPageSettingsResponse = CombinedSettingsResponse;

// todo: can we assumt the pageUrl from brwoser magic, or do we need to pass it as a parameter?
onMessage('getPickerPageSettings', async (request) => {
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

    return await PageRulesService.getCombinedSettingsResponse(urlOrigin);
});
