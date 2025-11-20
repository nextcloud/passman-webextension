import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
    extensions: ['.svelte'],
    compilerOptions: {},
    preprocess: [vitePreprocess({ script: true, style: true })]
};

export default config;
