/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,js,svelte,ts}",
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
