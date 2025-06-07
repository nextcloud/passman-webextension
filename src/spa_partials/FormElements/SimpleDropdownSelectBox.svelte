<script lang="ts">
    export let id: string = "";
    export let value: string;
    // { value: label }
    export let options: { [key: string]: string };
    export let small = false;
    export let onChangeCallback: () => void = () => {
    };
</script>

{#if options}
    <select id="{id}" bind:value on:change={onChangeCallback}
            class="select select-bordered max-w-xs !h-8 !min-h-0 dark:bg-neutral {small ? 'leading-4 !h-[1.4rem] text-xs' : ''}">
        {#each Object.keys(options) as key}
            <option value="{key}">{options[key]}</option>
        {/each}
    </select>
{/if}
