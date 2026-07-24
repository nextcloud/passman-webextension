import type { PendingDoorhangerCredential } from "~/services/backend/DoorhangerPendingCredentialService";
import { DoorhangerPendingCredentialService } from "~/services/backend/DoorhangerPendingCredentialService";
import { LegacyFormManagerService } from "~/services/frontend/LegacyFormManagerService";

export type DoorhangerSuccessDetectionResult = 'pending' | 'success' | 'abort';

export type DoorhangerSuccessDetectionContext = {
    pending: PendingDoorhangerCredential;
    currentUrl: string;
    now?: number;
};

/**
 * Pluggable success heuristic. Additional more fancy detectors can be registered later.
 */
export interface DoorhangerSuccessDetector {
    /** detector specific id (useful for the pluggable approach and for debugging) */
    readonly id: string;
    evaluate(context: DoorhangerSuccessDetectionContext): DoorhangerSuccessDetectionResult;
}

/**
 * Treat login as successful when the URL changed meaningfully from the
 * capture origin, or when no login form with a password field remains on the page.
 * Abort when the pending credential TTL has expired.
 * 
 * Not sure if this is the best approach.
 * Maybe we should use a more sophisticated approach like checking if the login form is gone and the user is redirected to the home page.
 * Maybe worth to take a deeper look in how it was handled in the previous version and what bitwarden does :D
 */
export class UrlChangeOrLoginFormGoneDetector implements DoorhangerSuccessDetector {
    public readonly id = 'urlChangeOrLoginFormGone';

    public evaluate = (context: DoorhangerSuccessDetectionContext): DoorhangerSuccessDetectionResult => {
        const now = context.now ?? Date.now();
        if (DoorhangerPendingCredentialService.isExpired(context.pending, now)) {
            return 'abort';
        }

        if (UrlChangeOrLoginFormGoneDetector.hasMeaningfulUrlChange(context.pending.originUrl, context.currentUrl)) {
            return 'success';
        }

        if (!UrlChangeOrLoginFormGoneDetector.hasLoginFormWithPassword()) {
            return 'success';
        }

        return 'pending';
    }

    public static hasMeaningfulUrlChange = (originUrl: string, currentUrl: string): boolean => {
        try {
            const origin = new URL(originUrl);
            const current = new URL(currentUrl);
            // Ignore hash-only changes (common on SPAs / anchors)
            return origin.origin !== current.origin
                || origin.pathname !== current.pathname
                || origin.search !== current.search;
        } catch {
            return originUrl !== currentUrl;
        }
    }

    public static hasLoginFormWithPassword = (): boolean => {
        const loginFieldsPerForm = LegacyFormManagerService.getLoginFieldsPerForm();
        return loginFieldsPerForm.some((fields) => (fields.passwordFields?.length ?? 0) > 0);
    }
}

/**
 * Runs registered detectors. First non-pending result wins (abort takes precedence
 * if any detector aborts before another reports success in the same pass).
 * Detectors are evaluated in registration order.
 */
export class DoorhangerSuccessDetectionService {
    private static detectors: DoorhangerSuccessDetector[] = [
        new UrlChangeOrLoginFormGoneDetector()
    ];

    public static registerDetector = (detector: DoorhangerSuccessDetector): void => {
        const existingIndex = DoorhangerSuccessDetectionService.detectors.findIndex((d) => d.id === detector.id);
        if (existingIndex !== -1) {
            // replace existing detector with the new one
            DoorhangerSuccessDetectionService.detectors[existingIndex] = detector;
            return;
        }
        DoorhangerSuccessDetectionService.detectors.push(detector);
    }

    public static unregisterDetector = (detectorId: string): void => {
        DoorhangerSuccessDetectionService.detectors = DoorhangerSuccessDetectionService.detectors.filter(
            (d) => d.id !== detectorId
        );
    }

    public static getDetectors = (): readonly DoorhangerSuccessDetector[] => {
        return DoorhangerSuccessDetectionService.detectors;
    }

    public static evaluate = (context: DoorhangerSuccessDetectionContext): DoorhangerSuccessDetectionResult => {
        for (const detector of DoorhangerSuccessDetectionService.detectors) {
            const result = detector.evaluate(context);
            if (result === 'abort' || result === 'success') {
                return result;
            }
        }

        return 'pending';
    }
}
