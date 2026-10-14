import type { CredentialRecoveryHitInterface } from "@binsky/passman-client-ts/lib/Interfaces/VaultRecoveryService/CredentialRecoveryHitInterface";

/**
 * Same snapshot passman-svelte builds from the live vault credential:
 * encrypted payload plus the ACL key when the credential was shared with us (that field lives beside the encrypted payload).
 */
export function originalCredentialJsonSnapshot(
    encrypted: object,
    encryptedSharedCredentialEncryptionKey: string | undefined
): string {
    const snapshot: Record<string, unknown> = { ...encrypted };
    if (encryptedSharedCredentialEncryptionKey !== undefined) {
        snapshot.encryptedSharedCredentialEncryptionKey = encryptedSharedCredentialEncryptionKey;
    }
    return JSON.stringify(snapshot, null, 2);
}

type OriginalJsonCredential = {
    getEncrypted: () => object;
    encryptedSharedCredentialEncryptionKey?: string;
};

/**
 * Original ciphertext is only shown for broken hits and for hits that have a recovered preview
 * (the "Show original JSON" toggle). Healthy hits are omitted so the dry-run response stays smaller.
 */
export function buildOriginalCredentialJsonByGuid(
    hits: Pick<CredentialRecoveryHitInterface, "guid" | "status" | "recoveredPreview">[],
    findCredential: (guid: string) => OriginalJsonCredential | undefined
): Record<string, string> {
    const jsonByGuid: Record<string, string> = {};
    for (const hit of hits) {
        if (hit.status !== "broken" && hit.recoveredPreview === undefined) {
            continue;
        }
        const credential = findCredential(hit.guid);
        if (!credential) {
            continue;
        }
        jsonByGuid[hit.guid] = originalCredentialJsonSnapshot(
            credential.getEncrypted(),
            credential.encryptedSharedCredentialEncryptionKey
        );
    }
    return jsonByGuid;
}
