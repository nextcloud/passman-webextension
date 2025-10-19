import { preprocessMeltUI } from '@melt-ui/pp'

const config = {
    extensions: ['.svelte'],
    compilerOptions: {},
    preprocess: [
        preprocessMeltUI() // must be last
    ]
};

export default config;


