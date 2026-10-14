import type {
    VaultRecoveryProgressStage
} from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/VaultRecoveryProgressInterface";

/**
 * {@link VaultRecoveryProgressStage} plus a webext-only stage for the (potentially slow, uncached) vault
 * fetch that `repairVaultRecovery.ts` does before ever calling into `VaultRecoveryService`.
 * The service's own stages only start once that fetch is done, so without this the page would show nothing
 * or just a generic fallback for however long the fetch takes (can be tens of seconds for a large vault).
 */
export type WebextVaultRecoveryProgressStage = VaultRecoveryProgressStage | 'loading';

/**
 * Lightweight progress push, sent from the background to the vault recovery page while a dry-run scan or
 * repair is running (see {@link onMessage}('repairVaultRecovery', ...)'s `onProgress` wiring).
 * Deliberately excludes the full `messages` log entries The page only shows a compact step/percentage indicator.
 *
 * Unlike every other message in this directory, this one flows background -> page: the background calls
 * `sendMessage`, and the page registers a listener with the raw (non-background-delayed) `onMessage` export.
 * There is no response to wait for; the background does not await the `sendMessage` promise either, since no
 * listener (e.g. the page not being open) must never block or fail the scan/repair itself.
 */
export interface VaultRecoveryProgressMessage {
    stage?: WebextVaultRecoveryProgressStage;
    doneSteps: number;
    totalSteps: number;
}
