import { defineConfig } from 'wxt';
import tailwindcss from "@tailwindcss/vite";

// Workaround plugin for svelte-sonner CSS module issue
function fixSvelteSonnerPlugin() {
    return {
        name: 'fix-svelte-sonner',
        enforce: 'pre' as const,
        resolveId(id: string) {
            // Intercept the problematic virtual CSS module
            if (id.includes('svelte-sonner') && id.includes('?svelte&type=style')) {
                return id;
            }
        },
        load(id: string) {
            // Return empty CSS for svelte-sonner style modules
            if (id.includes('svelte-sonner') && id.includes('?svelte&type=style')) {
                return '';
            }
        }
    };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-svelte'],
    manifest: {
        host_permissions: [
            "https://*/*",
            "<all_urls>",
        ],
        default_locale: "en",
        permissions: [
            "contextMenus",
            "storage",
            "tabs",
            "scripting"
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
                "id": "{5258e630-6a3c-11f0-81fa-a87eea04a880}"
            }
        }
    },
    vite: () => ({
        optimizeDeps: {
            exclude: ['svelte-sonner'],
            // Include the linked CommonJS package for ESM conversion
            include: ['@binsky/passman-client-ts']
        },
        ssr: {
            noExternal: ['svelte-sonner', '@binsky/passman-client-ts']
        },
        build: {
            commonjsOptions: {
                // Ensure proper CommonJS to ESM conversion for the linked package
                include: [/node_modules/, /passman-client-ts/],
                transformMixedEsModules: true
            }
        },
        plugins: [
            fixSvelteSonnerPlugin(),
            tailwindcss()
        ],
        css: {
            postcss: {
                plugins: [
                    // tailwindcss(),
                    // require('autoprefixer'),
                    require('postcss-rem-to-pixel')({
                        rootValue: 16
                    })
                ]
            }
        }
    }),
    svelte: {
        vite: {
            compilerOptions: {
                hmr: false
            },
            configFile: 'svelte.config.js'
        }
    }
});
