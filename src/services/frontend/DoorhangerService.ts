import type { FillableLoginFormFields } from "~/services/frontend/LegacyFormManagerService";
import type { PendingDoorhangerCredential } from "~/services/backend/DoorhangerPendingCredentialService";
import {
    DoorhangerSuccessDetectionService,
    type DoorhangerSuccessDetectionResult
} from "~/services/frontend/DoorhangerSuccessDetectionService";
import {
    DoorhangerMatchService,
    type DoorhangerOffer
} from "~/services/frontend/DoorhangerMatchService";
import { DynamicFormDetectionService } from "~/services/frontend/DynamicFormDetectionService";
import { sendMessage } from "@/entrypoints/background/messaging";
import {
    GetCredentialsListMessagingFilterType,
    type DecryptedPartialCredentialData
} from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
import type { CreateCredentialForPickerMessagingResponse } from "~/entrypoints/background/messages/createCredentialForPicker";
import type { UpdateCredentialForDoorhangerMessagingResponse } from "~/entrypoints/background/messages/updateCredentialForDoorhanger";
import { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
import {
    DEFAULT_DOORHANGER_SETTINGS,
    type DoorhangerSettings
} from "~/lib/doorhanger/doorhangerSettings";
import { logger } from "~/services/ConsoleLoggingService";

export type DoorhangerShowPayload = {
    offer: Extract<DoorhangerOffer, { show: true }>;
    settings: DoorhangerSettings;
};

/**
 * Content-script orchestration for Doorhanger capture, success detection,
 * offer resolution, and add/update actions.
 */
export class DoorhangerService {
    private static enabled = true;
    private static successHandledForCaptureAt: number | null = null;
    private static delayedEvaluateTimeouts: number[] = [];
    private static onOfferCallback: ((payload: DoorhangerShowPayload) => void) | null = null;
    private static onUrlMatchedCredentialsCallback: ((credentials: DecryptedPartialCredentialData[]) => void) | null = null;
    private static onCredentialUpsertCallback: ((credential: DecryptedPartialCredentialData) => void) | null = null;

    /** Delays (ms) after submit to re-check form-gone success without a URL change */
    private static readonly POST_SUBMIT_EVALUATE_DELAYS_MS = [400, 1200, 3000];

    public static setEnabled = (enabled: boolean): void => {
        DoorhangerService.enabled = enabled;
    }

    public static setOnOfferCallback = (
        callback: ((payload: DoorhangerShowPayload) => void) | null
    ): void => {
        DoorhangerService.onOfferCallback = callback;
    }

    public static setCredentialListCallbacks = (callbacks: {
        onUrlMatchedCredentials?: ((credentials: DecryptedPartialCredentialData[]) => void) | null;
        onCredentialUpsert?: ((credential: DecryptedPartialCredentialData) => void) | null;
    } | null): void => {
        DoorhangerService.onUrlMatchedCredentialsCallback = callbacks?.onUrlMatchedCredentials ?? null;
        DoorhangerService.onCredentialUpsertCallback = callbacks?.onCredentialUpsert ?? null;
    }

    /**
     * Call once when the password picker initializes for the page (covers full reloads)
     */
    public static init = (): void => {
        if (!DoorhangerService.enabled) {
            void DoorhangerService.clearPending();
            return;
        }
        void DoorhangerService.evaluateAfterPossibleLogin();
    }

    /**
     * Call on SPA URL changes
     */
    public static onUrlChanged = (_newUrl: string, _oldUrl: string): void => {
        if (!DoorhangerService.enabled) {
            return;
        }
        void DoorhangerService.evaluateAfterPossibleLogin();
    }

    /**
     * Capture submitted login fields into the tab-scoped SW pending store
     */
    public static cacheFromFormSubmit = async (loginFields: FillableLoginFormFields): Promise<boolean> => {
        if (!DoorhangerService.enabled) {
            return false;
        }

        const pageUrl = window.location.href;
        const username = loginFields.usernameField?.value?.trim() || undefined;
        const email = loginFields.emailField?.value?.trim() || undefined;
        const password = loginFields.passwordFields?.[0]?.value || undefined;

        // Need a password plus at least one identity field
        if (!password || (!username && !email)) {
            logger.debug('[Doorhanger] skip cache: missing password or identity');
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
                logger.debug('[Doorhanger] cache failed:', response.errorMessage);
                return false;
            }

            DoorhangerService.scheduleDelayedEvaluates();
            return true;
        } catch (error) {
            logger.error('[Doorhanger] cachePendingDoorhangerCredential failed', error);
            return false;
        }
    }

    /**
     * Fetch pending credential (if any) and run registered success detectors.
     * On success: pause form detection, resolve offer, invoke offer callback when shown.
     * Does not clear pending on show (kept until dismiss/save or TTL).
     */
    public static evaluateAfterPossibleLogin = async (): Promise<DoorhangerSuccessDetectionResult | null> => {
        if (!DoorhangerService.enabled) {
            return null;
        }

        let pending: PendingDoorhangerCredential | null | undefined;

        try {
            const response = await sendMessage('getPendingDoorhangerCredential');
            if (!response.status) {
                return null;
            }
            pending = response.pending;
        } catch (error) {
            logger.error('[Doorhanger] getPendingDoorhangerCredential failed', error);
            return null;
        }

        if (!pending) {
            return null;
        }

        const result = DoorhangerSuccessDetectionService.evaluate({
            pending,
            currentUrl: window.location.href
        });

        logger.debug('[Doorhanger] success detection result:', result);

        if (result === 'abort') {
            DoorhangerService.clearDelayedEvaluates();
            await DoorhangerService.clearPending();
            return result;
        }

        if (result === 'success') {
            await DoorhangerService.handleSuccess(pending);
            return result;
        }

        return result;
    }

    /**
     * Resolve add/update offer for a pending credential against URL-matched vault entries.
     * Returns show:false when locked or when an identical perfect match already exists.
     */
    public static resolveOffer = async (pending: PendingDoorhangerCredential): Promise<DoorhangerOffer> => {
        try {
            const unlockState = await sendMessage('getExtensionUnlockState');
            if (unlockState.status !== ExtensionUnlockState.UNLOCKED) {
                // locked or not set up yet
                return { show: false, reason: 'locked' };
            }
        } catch (error) {
            logger.error('[Doorhanger] getExtensionUnlockState failed', error);
            return { show: false, reason: 'locked' };
        }

        let urlMatchedCredentials: DecryptedPartialCredentialData[] = [];

        try {
            const credentialsResponse = await sendMessage('getPartiallyDecryptedFilteredCredentialsList', {
                filterText: window.location.href,
                filterType: GetCredentialsListMessagingFilterType.SEARCH_BY_URL,
                getCachedIfPossible: true
            });
            if (credentialsResponse.status) {
                urlMatchedCredentials = credentialsResponse.decryptedPartialCredentialData;
                DoorhangerService.onUrlMatchedCredentialsCallback?.(urlMatchedCredentials);
            }
        } catch (error) {
            logger.error('[Doorhanger] getPartiallyDecryptedFilteredCredentialsList failed', error);
        }

        return DoorhangerMatchService.resolveOffer(pending, urlMatchedCredentials);
    }

    public static getSettings = async (): Promise<DoorhangerSettings> => {
        try {
            return await sendMessage('getDoorhangerSettings');
        } catch (error) {
            logger.error('[Doorhanger] getDoorhangerSettings failed', error);
            return { ...DEFAULT_DOORHANGER_SETTINGS };
        }
    }

    /**
     * Create a new credential in the default vault from the pending capture (reuses createCredentialForPicker).
     */
    public static addFromPending = async (
        pending: PendingDoorhangerCredential
    ): Promise<CreateCredentialForPickerMessagingResponse> => {
        const response = await sendMessage('createCredentialForPicker', {
            credentialData: {
                label: pending.label,
                username: pending.username ?? '',
                email: pending.email ?? '',
                password: pending.password,
                url: pending.url
            }
        });

        if (response.status && response.decryptedPartialCredentialData) {
            DoorhangerService.onCredentialUpsertCallback?.(response.decryptedPartialCredentialData);
        }

        if (response.status) {
            await DoorhangerService.clearPending();
        }

        return response;
    }

    /**
     * Update an existing credential in the default vault with pending identity/password.
     */
    public static updateFromPending = async (
        pending: PendingDoorhangerCredential,
        guid: string
    ): Promise<UpdateCredentialForDoorhangerMessagingResponse> => {
        const response = await sendMessage('updateCredentialForDoorhanger', {
            guid,
            username: pending.username,
            email: pending.email,
            password: pending.password
        });

        if (response.status && response.decryptedPartialCredentialData) {
            DoorhangerService.onCredentialUpsertCallback?.(response.decryptedPartialCredentialData);
        }

        if (response.status) {
            await DoorhangerService.clearPending();
        }

        return response;
    }

    public static clearPending = async (): Promise<void> => {
        DoorhangerService.clearDelayedEvaluates();
        DoorhangerService.successHandledForCaptureAt = null;
        try {
            await sendMessage('clearPendingDoorhangerCredential');
        } catch (error) {
            logger.error('[Doorhanger] clearPendingDoorhangerCredential failed', error);
        }
    }

    public static unload = (): void => {
        DoorhangerService.clearDelayedEvaluates();
        DoorhangerService.successHandledForCaptureAt = null;
        DoorhangerService.onOfferCallback = null;
        DoorhangerService.onUrlMatchedCredentialsCallback = null;
        DoorhangerService.onCredentialUpsertCallback = null;
        DoorhangerService.enabled = true;
    }

    private static handleSuccess = async (pending: PendingDoorhangerCredential): Promise<void> => {
        if (!DoorhangerService.enabled) {
            await DoorhangerService.clearPending();
            return;
        }

        // avoid repeating success side-effects for the same capture
        if (DoorhangerService.successHandledForCaptureAt === pending.capturedAt) {
            return;
        }
        DoorhangerService.successHandledForCaptureAt = pending.capturedAt;
        DoorhangerService.clearDelayedEvaluates();

        // pause form-detection overhead after a successful login
        DynamicFormDetectionService.disableAll();

        const offer = await DoorhangerService.resolveOffer(pending);
        if (!offer.show) {
            logger.debug('[Doorhanger] offer resolved: hidden', offer);
            // identical credential already stored, or vault locked -> drop pending
            await DoorhangerService.clearPending();
            return;
        }

        logger.debug('[Doorhanger] offer resolved: show', {
            label: offer.pending.label,
            updateCandidates: offer.updateCandidates.length,
            preselectedGuid: offer.preselectedGuid,
        });

        const settings = await DoorhangerService.getSettings();
        logger.debug('[Doorhanger] using settings:', settings);

        if (DoorhangerService.onOfferCallback) {
            DoorhangerService.onOfferCallback({ offer, settings });
        } else {
            logger.debug('[Doorhanger] offer ready; UI not wired yet', {
                label: offer.pending.label,
                updateCandidates: offer.updateCandidates.length,
                preselectedGuid: offer.preselectedGuid,
                settings
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
