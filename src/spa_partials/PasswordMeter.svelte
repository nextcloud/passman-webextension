<script lang="ts">
    import type { ZxcvbnResult } from '@zxcvbn-ts/core';
    import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
    import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
    import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
    import Utils from "~lib/Utils";

    export let password = '';
    export let score = 0;

    let result: ZxcvbnResult;
    let progressColorClass: string;
    let textScore = '';

    const options = {
        translations: zxcvbnEnPackage.translations,
        graphs: zxcvbnCommonPackage.adjacencyGraphs,
        dictionary: {
            ...zxcvbnCommonPackage.dictionary,
        },
    };
    zxcvbnOptions.setOptions(options);

    const updateMeter = (password: string | null | undefined) => {
        if (password !== null && password !== undefined) {
            result = zxcvbn(password);
        }
    };
    const debouncedFunction = Utils.debounce(updateMeter, 200);


    $: debouncedFunction(password)
    $: {
        score = result?.score < 1 ? 1 : result?.score;
        switch (score) {
            case 2:
                progressColorClass = 'bg-orange-500';
                textScore = 'weak';
                break;
            case 3:
                progressColorClass = 'bg-yellow-400';
                textScore = 'good';
                break;
            case 4:
                progressColorClass = 'bg-green-500';
                textScore = 'strong';
                break;
            default:
                progressColorClass = 'bg-red-600';
                textScore = 'poor';
        }
    }

</script>

{#if password !== '' && result}
    <div class="mb-6 h-1 w-full bg-neutral-200 dark:bg-neutral-600">
        <div class="h-1 {progressColorClass}" style="width: { 25 * score }%"></div>
        <div class="w-full flex justify-end">
            <!--<p class="text-xs">Details</p>-->
            <p class="text-xs">{textScore}</p>
        </div>
    </div>
{/if}
