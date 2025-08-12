import { scopedPreflightStyles, isolateInsideOfContainer } from 'tailwindcss-scoped-preflight';

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,js,svelte,ts}",
        "./assets/**/*.{css,scss}"
    ],
    darkMode: "media",
    theme: {
        extend: {
            colors: {
                primary: {
                    focus: '#2563eb',
                },
            },
        },
    },
    plugins: [
        scopedPreflightStyles({
            isolationStrategy: isolateInsideOfContainer('.twp-passman-webextension', {
                except: '.no-twp-passman-webextension', // optional, to exclude some elements under .twp-passman-webextension from being preflighted, like external markup
            }),
        }),
    ],
}
