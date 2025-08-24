/**
 * @type {import('postcss').ProcessOptions}
 */
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        'postcss-rem-to-pixel': { rootValue: 16 }, // lock to 16px = 1rem
    }
}
