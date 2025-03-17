import stylisticTs from '@stylistic/eslint-plugin-ts'
import parserTs from '@typescript-eslint/parser'
import svelte from 'eslint-plugin-svelte'
import tailwindcssPlugin from 'eslint-plugin-tailwindcss'
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.mjs';
import globals from 'globals';

export default ts.config(
    ts.configs.recommended,
    ...svelte.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    {
        files: ['**/*.ts'],  // Specify files to lint
        plugins: {
            '@stylistic/ts': stylisticTs
        },
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json'
            }
        },
        rules: {
            '@stylistic/ts/indent': ['error', 4]
        }
    },
    {
        files: ['**/*.svelte'],  // Specify files to lint
        plugins: {
            '@stylistic/ts': stylisticTs,
            'tailwindcss': tailwindcssPlugin
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
                parser: ts.parser,
                svelteConfig
            }
        },
        rules: {
            '@stylistic/ts/indent': ['error', 4]
        }
    },
    {
        rules: {
          // Override or add rule settings here, such as:
          // 'svelte/rule-name': 'error'
        }
    },
    {
        ignores: [
            "node_modules/*",
            ".plasmo/*",
            "dist/*",
            "build/*",
            "packages/*"
        ]
    }
);
