import { beforeEach, describe, expect, mock, test } from "bun:test";

const secureData = new Map<string, unknown>();

mock.module("~/services/CustomStorageService", () => ({
    default: {
        getSecureStorage: async () => ({
            async get<T>(key: string): Promise<T | undefined> {
                return secureData.get(key) as T | undefined;
            },
            async set(key: string, value: unknown): Promise<void> {
                secureData.set(key, value);
            },
        }),
    },
}));

mock.module("~/services/ConsoleLoggingService", () => ({
    logger: {
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
        log: () => {},
    },
}));

const { default: EncryptionErrorSkippedCredentialStore } = await import("./EncryptionErrorSkippedCredentialStore");

const vaultA = "vault-a";
const vaultB = "vault-b";

const credential = (guid: string, label: string, credentialId = 1) => ({
    guid,
    label,
    credential_id: credentialId,
});

describe("EncryptionErrorSkippedCredentialStore", () => {
    beforeEach(() => {
        secureData.clear();
    });

    test("merge keeps older guids and updates a repeated guid", async () => {
        await EncryptionErrorSkippedCredentialStore.merge(vaultA, [
            credential("c1", "One", 1),
            credential("c2", "Two", 2),
        ]);

        const merged = await EncryptionErrorSkippedCredentialStore.merge(vaultA, [
            credential("c2", "Two renamed", 22),
            credential("c3", "Three", 3),
        ]);

        expect(merged).toEqual([
            { guid: "c1", label: "One", credentialId: 1 },
            { guid: "c2", label: "Two renamed", credentialId: 22 },
            { guid: "c3", label: "Three", credentialId: 3 },
        ]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultA)).toEqual(merged);

        const unchanged = await EncryptionErrorSkippedCredentialStore.merge(vaultA, []);
        expect(unchanged).toEqual(merged);
    });

    test("replace drops guids missing from the new batch and can store an empty list", async () => {
        await EncryptionErrorSkippedCredentialStore.replace(vaultA, [
            credential("c1", "One"),
            credential("c2", "Two"),
        ]);

        const replaced = await EncryptionErrorSkippedCredentialStore.replace(vaultA, [
            credential("c2", "Two"),
        ]);
        expect(replaced).toEqual([
            { guid: "c2", label: "Two", credentialId: 1 },
        ]);

        const emptied = await EncryptionErrorSkippedCredentialStore.replace(vaultA, []);
        expect(emptied).toEqual([]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultA)).toEqual([]);
    });

    test("clear removes only that vault", async () => {
        await EncryptionErrorSkippedCredentialStore.merge(vaultA, [credential("c1", "One")]);
        await EncryptionErrorSkippedCredentialStore.merge(vaultB, [credential("c2", "Two")]);

        await EncryptionErrorSkippedCredentialStore.clear(vaultA);

        expect(await EncryptionErrorSkippedCredentialStore.list(vaultA)).toEqual([]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultB)).toEqual([
            { guid: "c2", label: "Two", credentialId: 1 },
        ]);
    });

    test("a second vault's records stay intact", async () => {
        await EncryptionErrorSkippedCredentialStore.merge(vaultA, [credential("c1", "One")]);
        await EncryptionErrorSkippedCredentialStore.merge(vaultB, [credential("c2", "Two", 2)]);

        await EncryptionErrorSkippedCredentialStore.merge(vaultA, [credential("c3", "Three", 3)]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultB)).toEqual([
            { guid: "c2", label: "Two", credentialId: 2 },
        ]);

        await EncryptionErrorSkippedCredentialStore.replace(vaultA, [credential("c4", "Four", 4)]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultA)).toEqual([
            { guid: "c4", label: "Four", credentialId: 4 },
        ]);
        expect(await EncryptionErrorSkippedCredentialStore.list(vaultB)).toEqual([
            { guid: "c2", label: "Two", credentialId: 2 },
        ]);
    });
});
