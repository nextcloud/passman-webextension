import { describe, expect, test } from "bun:test";
import {
    buildOriginalCredentialJsonByGuid,
    originalCredentialJsonSnapshot
} from "./VaultRecoveryOriginalCredentialJson";

describe("originalCredentialJsonSnapshot", () => {
    test("copies the encrypted payload and pretty-prints it", () => {
        const json = originalCredentialJsonSnapshot({ guid: "abc", password: "cipher" }, undefined);
        expect(json).toBe(JSON.stringify({ guid: "abc", password: "cipher" }, null, 2));
        expect(json).not.toContain("encryptedSharedCredentialEncryptionKey");
    });

    test("includes the ACL key used for credentials shared with us", () => {
        const json = originalCredentialJsonSnapshot({ guid: "abc" }, "acl-cipher");
        expect(JSON.parse(json)).toEqual({
            guid: "abc",
            encryptedSharedCredentialEncryptionKey: "acl-cipher"
        });
    });
});

describe("buildOriginalCredentialJsonByGuid", () => {
    const credential = (guid: string, aclKey?: string) => ({
        getEncrypted: () => ({ guid, password: `${guid}-cipher` }),
        encryptedSharedCredentialEncryptionKey: aclKey
    });

    test("includes broken hits and hits with a recovered preview, and skips the rest", () => {
        const jsonByGuid = buildOriginalCredentialJsonByGuid(
            [
                { guid: "broken", status: "broken", recoveredPreview: undefined },
                { guid: "preview", status: "needs_rewrap", recoveredPreview: { username: "ada" } },
                { guid: "ok", status: "ok", recoveredPreview: undefined },
                { guid: "files-only", status: "needs_rewrap", recoveredPreview: undefined },
                { guid: "missing", status: "broken", recoveredPreview: undefined }
            ],
            (guid) => guid === "missing" ? undefined : credential(guid, guid === "preview" ? "acl" : undefined)
        );

        expect(Object.keys(jsonByGuid).sort()).toEqual(["broken", "preview"]);
        expect(JSON.parse(jsonByGuid.broken)).toEqual({ guid: "broken", password: "broken-cipher" });
        expect(JSON.parse(jsonByGuid.preview).encryptedSharedCredentialEncryptionKey).toBe("acl");
    });
});
