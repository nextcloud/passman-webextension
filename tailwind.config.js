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
    plugins: [],
}
