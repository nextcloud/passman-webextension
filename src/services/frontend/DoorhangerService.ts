import type { FillableLoginFormFields } from "~/services/frontend/LegacyFormManagerService";
import type { PendingDoorhangerCredential } from "~/services/backend/DoorhangerPendingCredentialService";
import {
    DoorhangerSuccessDetectionService,
    type DoorhangerSuccessDetectionResult
} from "~/services/frontend/DoorhangerSuccessDetectionService";
import { DynamicFormDetectionService } from "~/services/frontend/DynamicFormDetectionService";
import { sendMessage } from "@/entrypoints/background/messaging";

/**
 * Content-script orchestration for Doorhanger capture and success detection
 */
export class DoorhangerService {
    private static successHandledForCaptureAt: number | null = null;
    private static delayedEvaluateTimeouts: number[] = [];
    private static onSuccessCallback: ((pending: PendingDoorhangerCredential) => void) | null = null;

    /** Delays (ms) after submit to re-check form-gone success without a URL change */
    private static readonly POST_SUBMIT_EVALUATE_DELAYS_MS = [400, 1200, 3000];

    public static setOnSuccessCallback = (callback: ((pending: PendingDoorhangerCredential) => void) | null): void => {
        DoorhangerService.onSuccessCallback = callback;
    }

    /**
     * Call once when the password picker initializes for the page (covers full reloads)
     */
    public static init = (): void => {
        void DoorhangerService.evaluateAfterPossibleLogin();
    }

    /**
     * Call on SPA URL changes
     */
    public static onUrlChanged = (_newUrl: string, _oldUrl: string): void => {
        void DoorhangerService.evaluateAfterPossibleLogin();
    }

    /**
     * Capture submitted login fields into the tab-scoped SW pending store
     */
    public static cacheFromFormSubmit = async (loginFields: FillableLoginFormFields): Promise<boolean> => {
        const pageUrl = window.location.href;
        const username = loginFields.usernameField?.value?.trim() || undefined;
        const email = loginFields.emailField?.value?.trim() || undefined;
        const password = loginFields.passwordFields?.[0]?.value || undefined;

        // Need a password plus at least one identity field
        if (!password || (!username && !email)) {
            console.debug('[Doorhanger] skip cache: missing password or identity');
            return false;
        }

        let label = pageUrl;
        try {
            label = new URL(pageUrl).hostname;
        } catch {
            // keep pageUrl as label
        }

        DoorhangerService.successHandledForCaptureAt = null;
        DoorhangerService.clearDelayedEvaluates();

        try {
            const response = await sendMessage('cachePendingDoorhangerCredential', {
                username,
                email,
                password,
                url: pageUrl,
                label,
                originUrl: pageUrl
            });

            if (!response.status) {
                console.debug('[Doorhanger] cache failed:', response.errorMessage);
                return false;
            }

            DoorhangerService.scheduleDelayedEvaluates();
            return true;
        } catch (error) {
            console.error('[Doorhanger] cachePendingDoorhangerCredential failed', error);
            return false;
        }
    }

    /**
     * Fetch pending credential (if any) and run registered success detectors.
     * On success: pause form detection and invoke the success callback.
     * Does not clear pending (kept until dismiss/save or TTL).
     */
    public static evaluateAfterPossibleLogin = async (): Promise<DoorhangerSuccessDetectionResult | null> => {
        let pending: PendingDoorhangerCredential | null | undefined;

        try {
            const response = await sendMessage('getPendingDoorhangerCredential');
            if (!response.status) {
                return null;
            }
            pending = response.pending;
        } catch (error) {
            console.error('[Doorhanger] getPendingDoorhangerCredential failed', error);
            return null;
        }

        if (!pending) {
            return null;
        }

        const result = DoorhangerSuccessDetectionService.evaluate({
            pending,
            currentUrl: window.location.href
        });

        console.debug('[Doorhanger] success detection result:', result);

        if (result === 'abort') {
            DoorhangerService.clearDelayedEvaluates();
            try {
                await sendMessage('clearPendingDoorhangerCredential');
            } catch (error) {
                console.error('[Doorhanger] clearPendingDoorhangerCredential failed', error);
            }
            return result;
        }

        if (result === 'success') {
            DoorhangerService.handleSuccess(pending);
            return result;
        }

        return result;
    }

    public static clearPending = async (): Promise<void> => {
        DoorhangerService.clearDelayedEvaluates();
        DoorhangerService.successHandledForCaptureAt = null;
        try {
            await sendMessage('clearPendingDoorhangerCredential');
        } catch (error) {
            console.error('[Doorhanger] clearPendingDoorhangerCredential failed', error);
        }
    }

    public static unload = (): void => {
        DoorhangerService.clearDelayedEvaluates();
        DoorhangerService.successHandledForCaptureAt = null;
        DoorhangerService.onSuccessCallback = null;
    }

    private static handleSuccess = (pending: PendingDoorhangerCredential): void => {
        // avoid repeating success side-effects for the same capture
        if (DoorhangerService.successHandledForCaptureAt === pending.capturedAt) {
            return;
        }
        DoorhangerService.successHandledForCaptureAt = pending.capturedAt;
        DoorhangerService.clearDelayedEvaluates();

        // pause form-detection overhead after a successful login (see DynamicFormDetectionService TODO)
        DynamicFormDetectionService.disableAll();

        if (DoorhangerService.onSuccessCallback) {
            DoorhangerService.onSuccessCallback(pending);
        } else {
            console.debug('[Doorhanger] login success detected; UI not wired yet', {
                label: pending.label,
                url: pending.url
            });
        }
    }

    private static scheduleDelayedEvaluates = (): void => {
        for (const delayMs of DoorhangerService.POST_SUBMIT_EVALUATE_DELAYS_MS) {
            DoorhangerService.delayedEvaluateTimeouts.push(
                window.setTimeout(() => {
                    void DoorhangerService.evaluateAfterPossibleLogin();
                }, delayMs)
            );
        }
    }

    private static clearDelayedEvaluates = (): void => {
        for (const timeoutId of DoorhangerService.delayedEvaluateTimeouts) {
            window.clearTimeout(timeoutId);
        }
        DoorhangerService.delayedEvaluateTimeouts = [];
    }
}
