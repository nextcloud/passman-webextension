import { scopedPreflightStyles, isolateInsideOfContainer } from 'tailwindcss-scoped-preflight';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{html,js,svelte,ts}",
        "./public/**/*.{css,scss}"
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
