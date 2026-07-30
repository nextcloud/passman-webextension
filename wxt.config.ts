import { defineConfig } from 'wxt';
import tailwindcss from "@tailwindcss/vite";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { patchPublicLocaleAssets } = require('./scripts/fix-locales.cjs');

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-svelte'],
    zip: {
        artifactTemplate: "{{name}}-prod-{{browser}}.zip",
        sourcesTemplate: "{{name}}-prod-sources.zip"
    },
    hooks: {
        // Transifex locales often omit Chrome i18n `placeholders`. Patch during
        // public-asset copy (initial build and watch rebuilds) so source
        // translations stay untouched and reloads don't overwrite fixed output.
        'build:publicAssets'(_wxt, files) {
            patchPublicLocaleAssets(files, { quiet: true });
        },
    },
    manifest: {
        name: "__MSG_extName__",
        description: "__MSG_extDescription__",
        host_permissions: [
            "https://*/*",
            "<all_urls>",
        ],
        default_locale: "en",
        permissions: [
            "contextMenus",
            "storage",
            "tabs",
        ],
        web_accessible_resources: [
            {
                "resources": [
                    "assets/content_styles/*.css",
                    "assets/content_styles/*.scss"
                ],
                "matches": [
                    "http://*/*",
                    "https://*/*"
                ]
            }
        ],
        browser_specific_settings: {
            "gecko": {
                "id": "{ed412846-94d6-4a82-88bd-58b83e43f06d}"
            }
        }
    },
    vite: () => ({
        optimizeDeps: {
            // Include the linked CommonJS package for ESM conversion
            include: ['@binsky/passman-client-ts']
        },
        ssr: {
            noExternal: ['@binsky/passman-client-ts']
        },
        build: {
            commonjsOptions: {
                // Ensure proper CommonJS to ESM conversion for the linked package
                include: [/node_modules/, /passman-client-ts/],
                transformMixedEsModules: true
            }
        },
        plugins: [
            tailwindcss()
        ],
        css: {
            postcss: {
                plugins: [
                    // tailwindcss(),
                    require('autoprefixer'),
                    require('postcss-rem-to-pixel')({
                        rootValue: 16
                    })
                ]
            }
        }
    }),
    svelte: {
        vite: {
            preprocess: [vitePreprocess({ script: true, style: true })],
            compilerOptions: {
                hmr: false
            },
            configFile: 'svelte.config.js',
            onwarn: (warning, handler) => {
                // Ignore css-unused-selector warnings for PasswordPicker.svelte (it has embedded tailwind preflight styles)
                if (warning.code === 'css_unused_selector' && warning.filename?.includes('PasswordPicker.svelte')) {
                    return;
                }
                // Handle all other warnings normally
                handler(warning);
            }
        }
    }
});
