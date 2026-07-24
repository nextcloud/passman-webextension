import type { DecryptedPartialCredentialData } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
import type { PendingDoorhangerCredential } from "~/services/backend/DoorhangerPendingCredentialService";

export type DoorhangerOfferHiddenReason = 'locked' | 'no_changes' | 'no_pending';

export type DoorhangerOffer =
    | { show: false; reason: DoorhangerOfferHiddenReason }
    | {
        show: true;
        pending: PendingDoorhangerCredential;
        /** Perfect matches that need an update (password and/or identity drift). Empty => Add only. */
        updateCandidates: DecryptedPartialCredentialData[];
        /** First update candidate guid, or null when Add-only. */
        preselectedGuid: string | null;
    };

/**
 * Perfect-match / offer resolution for the Doorhanger (among URL-matched credentials).
 */
export class DoorhangerMatchService {
    /**
     * Entered login identities from the pending capture (trimmed non-empty username/email).
     */
    public static getEnteredIdentities = (pending: PendingDoorhangerCredential): string[] => {
        const identities: string[] = [];
        if (pending.username) {
            identities.push(pending.username);
        }
        if (pending.email) {
            identities.push(pending.email);
        }
        return identities;
    }

    /**
     * Perfect match: credential username or email equals any entered login identity.
     * Comparison is trimmed at capture time; matching is case-sensitive.
     */
    public static isPerfectMatch = (
        credential: DecryptedPartialCredentialData,
        pending: PendingDoorhangerCredential
    ): boolean => {
        const identities = DoorhangerMatchService.getEnteredIdentities(pending);
        if (identities.length === 0) {
            return false;
        }

        const credentialIdentities = [credential.username, credential.email]
            .filter((value): value is string => typeof value === 'string' && value.length > 0);

        return identities.some((identity) => credentialIdentities.includes(identity));
    }

    /**
     * True when password matches and every provided pending identity field already equals the credential.
     */
    public static isIdenticalToPending = (
        credential: DecryptedPartialCredentialData,
        pending: PendingDoorhangerCredential
    ): boolean => {
        if ((credential.password ?? '') !== pending.password) {
            return false;
        }

        if (pending.username !== undefined && (credential.username ?? '') !== pending.username) {
            return false;
        }

        if (pending.email !== undefined && (credential.email ?? '') !== pending.email) {
            return false;
        }

        return true;
    }

    /**
     * Resolve whether the Doorhanger should be shown and which credentials are update candidates.
     *
     * - Any identical perfect match -> hide (nothing to save/update)
     * - Perfect matches with password/identity drift -> Update candidates (add still offered by UI)
     * - Zero perfect matches -> show Add only
     */
    public static resolveOffer = (
        pending: PendingDoorhangerCredential,
        urlMatchedCredentials: DecryptedPartialCredentialData[]
    ): DoorhangerOffer => {
        const perfectMatches = urlMatchedCredentials.filter((credential) =>
            DoorhangerMatchService.isPerfectMatch(credential, pending)
        );

        if (perfectMatches.some((credential) => DoorhangerMatchService.isIdenticalToPending(credential, pending))) {
            return { show: false, reason: 'no_changes' };
        }

        const updateCandidates = perfectMatches.filter(
            (credential) => !DoorhangerMatchService.isIdenticalToPending(credential, pending)
        );

        return {
            show: true,
            pending,
            updateCandidates,
            preselectedGuid: updateCandidates[0]?.guid ?? null
        };
    }
}
