#!/usr/bin/env bun
/**
 * Build a synthetic legacy MV2 `browser.storage.local` fixture for testing
 * LegacySettingsMigrationService without building the old extension.
 *
 * Usage:
 *   bun scripts/build-legacy-settings-fixture.ts
 *   bun scripts/build-legacy-settings-fixture.ts --accounts 2
 *   bun scripts/build-legacy-settings-fixture.ts --password my-master --no-remember
 *   bun scripts/build-legacy-settings-fixture.ts --self-test
 *   bun scripts/build-legacy-settings-fixture.ts --snippet
 *
 * See scripts/legacy-settings-migration-test.md for the full browser checklist.
 */

import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const { PassmanCrypto } = require("@binsky/passman-client-ts/lib/Service/PassmanCrypto.js") as {
    PassmanCrypto: {
        encryptString: (plainText: string, key: string) => string;
        decryptString: (b64EncCiphertext: string, key: string) => string;
    };
};

type LegacyAccount = {
    nextcloud_host: string;
    nextcloud_username: string;
    nextcloud_password: string;
    vault: { guid: string; name: string };
    vault_password: string;
};

function buildAccounts(count: number): LegacyAccount[] {
    const accounts: LegacyAccount[] = [
        {
            nextcloud_host: "https://cloud.example.com",
            nextcloud_username: "alice",
            nextcloud_password: "app-password-alice",
            vault: { guid: "vault-guid-alice", name: "Personal" },
            vault_password: "vault-pass-alice",
        },
        {
            nextcloud_host: "https://nc.example.org",
            nextcloud_username: "bob",
            nextcloud_password: "app-password-bob",
            vault: { guid: "vault-guid-bob", name: "Work" },
            vault_password: "vault-pass-bob",
        },
    ];
    if (count < 1 || count > accounts.length) {
        throw new Error(`--accounts must be between 1 and ${accounts.length}`);
    }
    return accounts.slice(0, count);
}

function buildFixture(options: {
    accountCount: number;
    masterPassword: string;
    rememberMasterPassword: boolean;
}) {
    const accounts = buildAccounts(options.accountCount);
    const encryptedAccounts = PassmanCrypto.encryptString(
        JSON.stringify(accounts),
        options.masterPassword
    );

    const fixture: Record<string, unknown> = {
        settings: {
            accounts: encryptedAccounts,
            ignoreProtocol: true,
            ignoreSubdomain: true,
            ignorePath: true,
            ignorePort: true,
            enableAutoFill: true,
            enableAutoSubmit: false,
            ignored_sites: ["https://example.com"],
            generatedPasswordLength: 16,
            debug: false,
        },
    };

    if (options.rememberMasterPassword) {
        fixture.master_password = options.masterPassword;
    }

    return { fixture, accounts };
}

function printHelp() {
    console.log(`Build a legacy MV2 settings fixture for chrome.storage.local injection.

Usage:
  bun scripts/build-legacy-settings-fixture.ts [options]

Options:
  --accounts <n>     Number of accounts (1 or 2). Default: 1
  --password <pw>    Legacy master password. Default: test-master
  --no-remember      Omit plaintext master_password from the fixture
  --snippet          Print a ready-to-paste chrome.storage.local.set(...) snippet
  --reset-snippet    Also print a snippet that clears MV3 setup keys first
  --self-test        Encrypt then decrypt and exit non-zero on mismatch
  --help             Show this help

Docs: scripts/legacy-settings-migration-test.md
`);
}

function main() {
    const { values } = parseArgs({
        options: {
            accounts: { type: "string", default: "1" },
            password: { type: "string", default: "test-master" },
            "no-remember": { type: "boolean", default: false },
            snippet: { type: "boolean", default: false },
            "reset-snippet": { type: "boolean", default: false },
            "self-test": { type: "boolean", default: false },
            help: { type: "boolean", default: false },
        },
        strict: true,
    });

    if (values.help) {
        printHelp();
        return;
    }

    const accountCount = Number.parseInt(values.accounts ?? "1", 10);
    const masterPassword = values.password ?? "test-master";
    const rememberMasterPassword = !values["no-remember"];

    const { fixture, accounts } = buildFixture({
        accountCount,
        masterPassword,
        rememberMasterPassword,
    });

    if (values["self-test"]) {
        const encrypted = (fixture.settings as { accounts: string }).accounts;
        const decrypted = JSON.parse(PassmanCrypto.decryptString(encrypted, masterPassword));
        if (!Array.isArray(decrypted) || decrypted.length !== accounts.length) {
            console.error("self-test failed: account count mismatch");
            process.exit(1);
        }
        if (decrypted[0].nextcloud_username !== accounts[0].nextcloud_username) {
            console.error("self-test failed: first account mismatch");
            process.exit(1);
        }
        console.log(`self-test ok (${accounts.length} account(s), password=${JSON.stringify(masterPassword)})`);
        return;
    }

    if (values["reset-snippet"] || values.snippet) {
        if (values["reset-snippet"]) {
            console.log("// 1) Clear MV3 setup / secure-storage state (run in extension SW console)");
            console.log(`await chrome.storage.local.remove([
  "extensionSetupDone",
  "extensionUnlockPasswordHash",
  "encryptedStorageKey",
  "migration.legacySettingsImported",
  "settings",
  "master_password"
]);
await chrome.storage.session.clear();
`);
            console.log("// 2) Inject legacy fixture");
        }
        console.log(`await chrome.storage.local.set(${JSON.stringify(fixture, null, 2)});`);
        console.log("");
        console.log(`// Master password: ${masterPassword}`);
        console.log(`// Accounts: ${accounts.length} (${accounts.map((a) => a.nextcloud_username).join(", ")})`);
        return;
    }

    console.log(JSON.stringify(fixture, null, 2));
    console.error(`# master password: ${masterPassword}`);
    console.error(`# accounts: ${accounts.length}`);
    console.error("# tip: add --snippet for a paste-ready chrome.storage.local.set(...) call");
}

main();
