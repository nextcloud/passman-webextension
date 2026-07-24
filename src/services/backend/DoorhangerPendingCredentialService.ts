export type PendingDoorhangerCredential = {
    username?: string;
    email?: string;
    password: string;
    url: string;
    label: string;
    capturedAt: number;
    originUrl: string;
};

/**
 * Tab-scoped simple in-memory store for credentials captured on login form submit.
 * Survives content-script reinjection after navigation (lives in the service worker).
 * Won't survive a service worker reload / shutdown.
 */
export class DoorhangerPendingCredentialService {
    // 60 seconds should be enough for most users to complete the login process
    public static readonly TTL_MS = 60_000;

    private static pendingByTabId = new Map<number, PendingDoorhangerCredential>();

    public static set = (tabId: number, pending: PendingDoorhangerCredential): void => {
        DoorhangerPendingCredentialService.pendingByTabId.set(tabId, pending);
    }

    /**
     * Returns pending credential for the tab, or null if missing / expired.
     * Expired entries are removed.
     */
    public static get = (tabId: number): PendingDoorhangerCredential | null => {
        const pending = DoorhangerPendingCredentialService.pendingByTabId.get(tabId);
        if (!pending) {
            return null;
        }
        if (DoorhangerPendingCredentialService.isExpired(pending)) {
            DoorhangerPendingCredentialService.clear(tabId);
            return null;
        }
        return pending;
    }

    public static clear = (tabId: number): void => {
        DoorhangerPendingCredentialService.pendingByTabId.delete(tabId);
    }

    public static clearAll = (): void => {
        DoorhangerPendingCredentialService.pendingByTabId.clear();
    }

    public static isExpired = (pending: PendingDoorhangerCredential, now: number = Date.now()): boolean => {
        return now - pending.capturedAt > DoorhangerPendingCredentialService.TTL_MS;
    }
}
