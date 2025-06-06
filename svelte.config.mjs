import preprocess from 'svelte-preprocess';
import { preprocessMeltUI, sequence } from '@melt-ui/pp'

const config = {
    preprocess: sequence([
        // ... other preprocessors
        preprocess({
            typescript: true
        }),
        preprocessMeltUI() // add to the end!
    ])
};

export default config;
