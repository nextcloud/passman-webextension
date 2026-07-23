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
 * Only writes into the given directory (typically `.output/.../_locales`).
 * Never modify Transifex-managed source files under `public/_locales` except `en`.
 */

const fs = require('fs');
const path = require('path');

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
        let changed = false;

        for (const translateKey of Object.keys(jsonData)) {
            const enEntry = en[translateKey];
            const localeEntry = jsonData[translateKey];
            // Original script incorrectly checked translateKey.hasOwnProperty(...).
            // Intent: copy English placeholders when the translated entry lacks them.
            if (
                enEntry
                && localeEntry
                && Object.prototype.hasOwnProperty.call(enEntry, 'placeholders')
                && !Object.prototype.hasOwnProperty.call(localeEntry, 'placeholders')
            ) {
                localeEntry.placeholders = enEntry.placeholders;
                changed = true;
                keysFixed += 1;
                if (!quiet) {
                    console.log(`Fixed ${file} translate key: ${translateKey}`);
                }
            }
        }

        if (changed) {
            fs.writeFileSync(file, `${JSON.stringify(jsonData, null, 4)}\n`, 'utf8');
            filesFixed += 1;
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

module.exports = { fixLocalePlaceholders };

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
