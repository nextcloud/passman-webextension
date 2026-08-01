import type { ModelStoreInterface } from "@binsky/passman-client-ts/lib/Interfaces/ModelStoreInterface";
import type { GenericVaultInformationFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/GenericVaultInformationFromServerInterface";
import type { SerializableTransferFullVaultInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/SerializableTransferFullVaultInterface";
import type { SerializableTransferCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/SerializableTransferCredentialInterface";
import type { IndexedDbModelStoreSizeEstimate } from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";

/**
 * Volatile {@link ModelStoreInterface} for when native IndexedDB is unavailable or the user chooses in-memory cache.
 * Using fake-indexeddb as polyfill was not successful, so unfortunately we have to use this dedicated model store. (hopefully without unexpected side effects)
 */
export default class InMemoryModelStore implements ModelStoreInterface {
    private readonly vaultLists = new Map<string, GenericVaultInformationFromServerInterface[]>();
    private readonly vaults = new Map<string, SerializableTransferFullVaultInterface["serializableSpecificVaultInformation"]>();
    private readonly credentials = new Map<string, SerializableTransferCredentialInterface>();

    private static vaultKey(connectionId: string, guid: string): string {
        return `${connectionId}::${guid}`;
    }

    private static credentialKey(connectionId: string, vaultGuid: string, credentialGuid: string): string {
        return `${connectionId}::${vaultGuid}::${credentialGuid}`;
    }

    async getVaultList(connectionId: string) {
        return this.vaultLists.get(connectionId);
    }

    async putVaultList(connectionId: string, vaultList: GenericVaultInformationFromServerInterface[]) {
        this.vaultLists.set(connectionId, vaultList);
    }

    async getVault(connectionId: string, guid: string) {
        const vaultInfo = this.vaults.get(InMemoryModelStore.vaultKey(connectionId, guid));
        if (!vaultInfo) {
            return undefined;
        }
        const prefix = `${connectionId}::${guid}::`;
        const encryptedSerializableCredentials: SerializableTransferCredentialInterface[] = [];
        for (const [key, credential] of this.credentials) {
            if (key.startsWith(prefix)) {
                encryptedSerializableCredentials.push(credential);
            }
        }
        return {
            serializableSpecificVaultInformation: vaultInfo,
            encryptedSerializableCredentials,
        };
    }

    /**
     * Put a new vault into the model store.
     * Not that computationally efficient since all credentials are re-added to the model store.
     * @param connectionId 
     * @param vault 
     */
    async putVault(connectionId: string, vault: SerializableTransferFullVaultInterface) {
        const guid = vault.serializableSpecificVaultInformation.guid;
        this.vaults.set(
            InMemoryModelStore.vaultKey(connectionId, guid),
            vault.serializableSpecificVaultInformation
        );

        // remove all known old vault associated credentials, before filling in the new/current ones;
        // may looks strange, but it's more effective than checking for new and comparing existing credentials in a loop
        const vaultPrefix = `${connectionId}::${guid}::`;
        for (const key of [...this.credentials.keys()]) {
            if (key.startsWith(vaultPrefix)) {
                this.credentials.delete(key);
            }
        }
        for (const credential of vault.encryptedSerializableCredentials) {
            const credentialGuid = credential.encryptedData.guid;
            this.credentials.set(
                InMemoryModelStore.credentialKey(connectionId, guid, credentialGuid),
                credential
            );
        }
    }

    async deleteVault(connectionId: string, guid: string) {
        this.vaults.delete(InMemoryModelStore.vaultKey(connectionId, guid));
        const prefix = `${connectionId}::${guid}::`;
        for (const key of [...this.credentials.keys()]) {
            if (key.startsWith(prefix)) {
                this.credentials.delete(key);
            }
        }
    }

    async getCredential(connectionId: string, vaultGuid: string, credentialGuid: string) {
        return this.credentials.get(
            InMemoryModelStore.credentialKey(connectionId, vaultGuid, credentialGuid)
        );
    }

    async putCredential(
        connectionId: string,
        vaultGuid: string,
        credential: SerializableTransferCredentialInterface
    ) {
        const credentialGuid = credential.encryptedData.guid;
        this.credentials.set(
            InMemoryModelStore.credentialKey(connectionId, vaultGuid, credentialGuid),
            credential
        );
    }

    async deleteCredential(connectionId: string, vaultGuid: string, credentialGuid: string) {
        this.credentials.delete(
            InMemoryModelStore.credentialKey(connectionId, vaultGuid, credentialGuid)
        );
    }

    async estimateSize(): Promise<IndexedDbModelStoreSizeEstimate> {
        let bytes = 0;
        const measure = (value: unknown) => {
            bytes += new Blob([JSON.stringify(value)]).size;
        };
        for (const value of this.vaultLists.values()) {
            measure(value);
        }
        for (const value of this.vaults.values()) {
            measure(value);
        }
        for (const value of this.credentials.values()) {
            measure(value);
        }
        return {
            bytes,
            vaultListCount: this.vaultLists.size,
            vaultCount: this.vaults.size,
            credentialCount: this.credentials.size,
        };
    }

    async clearDatabase(): Promise<void> {
        this.vaultLists.clear();
        this.vaults.clear();
        this.credentials.clear();
    }
}
