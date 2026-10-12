import CustomStorageService from "~/services/CustomStorageService";
import { logger } from "~/services/ConsoleLoggingService";

/**
 * Non-secret identity of a credential skipped because decryption failed.
 * `label` is the plaintext credential label. Empty when the server label is missing.
 */
export interface SkippedEncryptionErrorCredential {
    guid: string;
    credentialId: number;
    label: string;
}

/** Live credential, or a test double, that can be stored without reading encrypted fields. */
export interface EncryptionErrorSkippedCredentialInput {
    guid: string;
    credential_id: number;
    label?: string | null;
}

type StoredByVaultGuid = Record<string, SkippedEncryptionErrorCredential[]>;

/**
 * Remembers credentials {@link CredentialFilterService} skipped after an encryption error.
 *
 * Stored in secure local storage so labels survive a lock (session storage is wiped on lock)
 * and are not written in plaintext.
 * Cleared only by {@link replace} or {@link clear} (vault recovery repair started or a full server refresh).
 */
export default class EncryptionErrorSkippedCredentialStore {
    private static readonly STORAGE_KEY = "encryptionErrorSkippedCredentials";

    /**
     * Adds or updates guids for this vault and leaves previously stored guids in place.
     * An empty batch does not write and returns the current list unchanged.
     */
    public static async merge(
        vaultGuid: string,
        credentials: EncryptionErrorSkippedCredentialInput[]
    ): Promise<SkippedEncryptionErrorCredential[]> {
        if (!vaultGuid) {
            return [];
        }

        const all = await this.readAll();
        const existing = [...(all[vaultGuid] ?? [])];
        const incoming = this.dedupe(credentials);
        if (incoming.length === 0) {
            return existing;
        }

        let changed = false;
        for (const credential of incoming) {
            const index = existing.findIndex((item) => item.guid === credential.guid);
            if (index === -1) {
                existing.push(credential);
                this.logSkipped(credential);
                changed = true;
            } else if (
                existing[index].label !== credential.label
                || existing[index].credentialId !== credential.credentialId
            ) {
                existing[index] = credential;
                this.logSkipped(credential);
                changed = true;
            }
        }

        if (!changed) {
            return existing;
        }

        all[vaultGuid] = existing;
        await this.writeAll(all);
        return existing;
    }

    /**
     * Sets this vault's list to exactly this batch, including an empty list.
     * Other vaults are left intact.
     */
    public static async replace(
        vaultGuid: string,
        credentials: EncryptionErrorSkippedCredentialInput[]
    ): Promise<SkippedEncryptionErrorCredential[]> {
        if (!vaultGuid) {
            return [];
        }

        const all = await this.readAll();
        const previous = new Map((all[vaultGuid] ?? []).map((item) => [item.guid, item]));
        const next = this.dedupe(credentials);
        for (const credential of next) {
            const prior = previous.get(credential.guid);
            if (
                !prior
                || prior.label !== credential.label
                || prior.credentialId !== credential.credentialId
            ) {
                this.logSkipped(credential);
            }
        }

        all[vaultGuid] = next;
        await this.writeAll(all);
        return next;
    }

    /** Removes one vault's entry. Other vaults stay stored. */
    public static async clear(vaultGuid: string): Promise<void> {
        if (!vaultGuid) {
            return;
        }

        const all = await this.readAll();
        if (!Object.hasOwn(all, vaultGuid)) {
            return;
        }

        delete all[vaultGuid];
        await this.writeAll(all);
    }

    public static async list(vaultGuid: string): Promise<SkippedEncryptionErrorCredential[]> {
        if (!vaultGuid) {
            return [];
        }

        const all = await this.readAll();
        return [...(all[vaultGuid] ?? [])];
    }

    private static dedupe(credentials: EncryptionErrorSkippedCredentialInput[]): SkippedEncryptionErrorCredential[] {
        const byGuid = new Map<string, SkippedEncryptionErrorCredential>();
        const order: string[] = [];
        for (const credential of credentials) {
            if (!credential.guid) {
                continue;
            }
            if (!byGuid.has(credential.guid)) {
                order.push(credential.guid);
            }
            const label = typeof credential.label === "string" ? credential.label : "";
            const credentialId = typeof credential.credential_id === "number" && Number.isFinite(credential.credential_id)
                ? credential.credential_id
                : 0;
            byGuid.set(credential.guid, {
                guid: credential.guid,
                credentialId,
                label,
            });
        }
        return order.map((guid) => byGuid.get(guid)!);
    }

    private static logSkipped(credential: SkippedEncryptionErrorCredential): void {
        logger.warn("[encryption-error-skipped]", credential.guid, credential.label);
    }

    private static async readAll(): Promise<StoredByVaultGuid> {
        const storage = await CustomStorageService.getSecureStorage();
        const stored = await storage.get<StoredByVaultGuid>(this.STORAGE_KEY);
        if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
            return {};
        }
        return { ...stored };
    }

    private static async writeAll(all: StoredByVaultGuid): Promise<void> {
        const storage = await CustomStorageService.getSecureStorage();
        await storage.set(this.STORAGE_KEY, all);
    }
}
