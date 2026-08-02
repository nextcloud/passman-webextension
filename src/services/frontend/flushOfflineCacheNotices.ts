import OfflineCacheStorageService from "~/services/OfflineCacheStorageService";
import NotyService from "~/services/frontend/NotyService";
import { i18n } from "~/lib/i18n";

/**
 * Consume a session offline-cache notice and show a pinned toast (popup/options).
 */
export async function flushOfflineCacheNotices(): Promise<void> {
    const notice = await OfflineCacheStorageService.consumeNotice();
    if (!notice) {
        return;
    }
    if (notice.code === "quota") {
        NotyService.notyPinnedError(i18n.getMessage("offline_cache_quota_notice"));
        return;
    }
    NotyService.notyPinnedWarning(i18n.getMessage("offline_cache_forced_fallback_notice"));
}
