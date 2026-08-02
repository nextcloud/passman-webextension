import { describe, expect, test } from "bun:test";
import InMemoryModelStore from "./InMemoryModelStore";

const fakeConnectionId = "https://example.com|alice|passman";

describe("InMemoryModelStore", () => {
    test("put/get vault list is namespaced by connectionId", async () => {
        const store = new InMemoryModelStore();
        const listing = [
            {
                vault_id: 1,
                guid: "v1",
                name: "Vault",
                created: 1,
                public_sharing_key: null,
                last_access: 0,
                challenge_password: "x",
                delete_request_pending: false,
            },
        ];

        await store.putVaultList(fakeConnectionId, listing);
        expect(await store.getVaultList(fakeConnectionId)).toEqual(listing);
        expect(await store.getVaultList("other")).toBeUndefined();

        const size = await store.estimateSize();
        expect(size.vaultListCount).toBe(1);
    });

    test("put/get/delete credential and clearDatabase", async () => {
        const testCredentialGuid = "c1";
        const testCredential2Guid = "c2";
        const testVaultGuid = "v1";
        const store = new InMemoryModelStore();
        const credential = {
            encryptedData: { guid: testCredentialGuid },
        } as any;
        const credential2 = {
            encryptedData: { guid: testCredential2Guid },
        } as any;

        await store.putCredential(fakeConnectionId, testVaultGuid, credential);
        expect(await store.getCredential(fakeConnectionId, testVaultGuid, testCredentialGuid)).toEqual(credential);
        await store.putCredential(fakeConnectionId, testVaultGuid, credential2);
        expect(await store.getCredential(fakeConnectionId, testVaultGuid, testCredential2Guid)).toEqual(credential2);

        const size1 = await store.estimateSize();
        expect(size1.vaultListCount).toBe(0);
        expect(size1.credentialCount).toBe(2);
        expect(size1.bytes).toBeGreaterThan(0);

        await store.deleteCredential(fakeConnectionId, testVaultGuid, testCredentialGuid);
        expect(await store.getCredential(fakeConnectionId, testVaultGuid, testCredentialGuid)).toBeUndefined();

        await store.putVaultList(fakeConnectionId, []);
        await store.clearDatabase();

        const size2 = await store.estimateSize();
        expect(size2.vaultListCount).toBe(0);
        expect(size2.credentialCount).toBe(0);
        expect(size2.bytes).toBe(0);
    });
});
