#!/usr/bin/env node
/**
 * Sync Chrome i18n `placeholders` from English into other locale files.
 *
 * Transifex often ships translated `message` strings that still use $PLACEHOLDER$
 * tokens, but omit the required `placeholders` map. Chrome/Firefox then refuse to
 * load the extension.
 *
 * Based on the legacy fix:
 * https://github.com/nextcloud/passman-webextension/blob/master/fixLocale.js
 *
 * Usage:
 *   node scripts/fix-locales.cjs <localesDir>
 *
 * Prefer the WXT `build:publicAssets` hook (see wxt.config.ts) so output locales
 * are patched on every public-asset copy, including watch rebuilds. The CLI is
 * for manual fixes of an on-disk `_locales` directory only.
 * Never modify Transifex-managed source files under `public/_locales` except `en`.
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_RELATIVE_RE = /^_locales[/\\]([^/\\]+)[/\\]messages\.json$/;

/**
 * Copy missing `placeholders` from English entries into a locale messages object.
 *
 * @param {Record<string, any>} en
 * @param {Record<string, any>} localeData
 * @returns {number} Number of keys that received placeholders
 */
function applyPlaceholdersFromEnglish(en, localeData) {
    let keysFixed = 0;

    for (const translateKey of Object.keys(localeData)) {
        const enEntry = en[translateKey];
        const localeEntry = localeData[translateKey];
        // Original script incorrectly checked translateKey.hasOwnProperty(...).
        // Intent: copy English placeholders when the translated entry lacks them.
        if (
            enEntry
            && localeEntry
            && Object.prototype.hasOwnProperty.call(enEntry, 'placeholders')
            && !Object.prototype.hasOwnProperty.call(localeEntry, 'placeholders')
        ) {
            localeEntry.placeholders = enEntry.placeholders;
            keysFixed += 1;
        }
    }

    return keysFixed;
}

/**
 * Patch non-English locale messages.json entries in a WXT public-assets list
 * in place, replacing them with fixed relativeDest/contents objects so the copy
 * step writes corrected output without touching source files.
 *
 * @param {Array<object>} files WXT ResolvedPublicFile list (mutated in place)
 * @param {{ quiet?: boolean }} [options]
 * @returns {{ filesFixed: number, keysFixed: number }}
 */
function patchPublicLocaleAssets(files, options = {}) {
    const quiet = options.quiet === true;
    const enIndex = files.findIndex((file) => {
        const match = MESSAGES_RELATIVE_RE.exec(file.relativeDest);
        return match?.[1] === 'en';
    });

    if (enIndex === -1) {
        throw new Error('English locale not found in public assets (_locales/en/messages.json)');
    }

    const enFile = files[enIndex];
    const enSource = 'contents' in enFile && enFile.contents != null
        ? String(enFile.contents)
        : fs.readFileSync(enFile.absoluteSrc, 'utf8');
    const en = JSON.parse(enSource);

    let filesFixed = 0;
    let keysFixed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const match = MESSAGES_RELATIVE_RE.exec(file.relativeDest);
        if (!match || match[1] === 'en') {
            continue;
        }

        const source = 'contents' in file && file.contents != null
            ? String(file.contents)
            : fs.readFileSync(file.absoluteSrc, 'utf8');
        const localeData = JSON.parse(source);
        const fixedKeys = applyPlaceholdersFromEnglish(en, localeData);

        if (fixedKeys === 0) {
            continue;
        }

        files[i] = {
            relativeDest: file.relativeDest,
            contents: `${JSON.stringify(localeData, null, 4)}\n`,
        };
        filesFixed += 1;
        keysFixed += fixedKeys;
    }

    if (!quiet) {
        console.log(
            `Locale placeholder fix complete: ${keysFixed} key(s) in ${filesFixed} file(s) via build:publicAssets`
        );
    } else if (keysFixed > 0) {
        console.log(
            `Locale placeholder fix complete: ${keysFixed} key(s) in ${filesFixed} file(s) via build:publicAssets`
        );
    }

    return { filesFixed, keysFixed };
}

/**
 * @param {string} localesDir Absolute or relative path to an `_locales` directory
 * @param {{ quiet?: boolean }} [options]
 * @returns {{ filesFixed: number, keysFixed: number }}
 */
function fixLocalePlaceholders(localesDir, options = {}) {
    const quiet = options.quiet === true;
    const absoluteLocalesDir = path.resolve(localesDir);
    const enPath = path.join(absoluteLocalesDir, 'en', 'messages.json');

    if (!fs.existsSync(enPath)) {
        throw new Error(`English locale not found at ${enPath}`);
    }

    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const localeDirs = fs.readdirSync(absoluteLocalesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'en')
        .map((entry) => entry.name);

    let filesFixed = 0;
    let keysFixed = 0;

    for (const locale of localeDirs) {
        const file = path.join(absoluteLocalesDir, locale, 'messages.json');
        if (!fs.existsSync(file)) {
            continue;
        }

        const jsonData = JSON.parse(fs.readFileSync(file, 'utf8'));
        const fixedKeys = applyPlaceholdersFromEnglish(en, jsonData);

        if (fixedKeys > 0) {
            fs.writeFileSync(file, `${JSON.stringify(jsonData, null, 4)}\n`, 'utf8');
            filesFixed += 1;
            keysFixed += fixedKeys;
            if (!quiet) {
                console.log(`Fixed ${file}: ${fixedKeys} key(s)`);
            }
        }
    }

    if (!quiet) {
        console.log(
            `Locale placeholder fix complete: ${keysFixed} key(s) in ${filesFixed} file(s) under ${absoluteLocalesDir}`
        );
    } else if (keysFixed > 0) {
        console.log(
            `Locale placeholder fix complete: ${keysFixed} key(s) in ${filesFixed} file(s) under ${absoluteLocalesDir}`
        );
    }

    return { filesFixed, keysFixed };
}

module.exports = {
    applyPlaceholdersFromEnglish,
    fixLocalePlaceholders,
    patchPublicLocaleAssets,
};

if (require.main === module) {
    const localesDir = process.argv[2];
    if (!localesDir) {
        console.error('Usage: node scripts/fix-locales.cjs <localesDir>');
        process.exit(1);
    }
    try {
        fixLocalePlaceholders(localesDir);
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
