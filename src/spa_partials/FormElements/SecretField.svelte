<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import eye from "svelte-awesome/icons/eye";
    import eyeSlash from "svelte-awesome/icons/eyeSlash";

    export let value: string;
    export let hideHiddenToggle: boolean = false;
    let hidden = true;

    $: value && (hidden = true);
</script>

{#if value}
    {#if hidden && !hideHiddenToggle}
        {#each value as _}
            *
        {/each}
        <button on:click={() => {hidden = !hidden;}}
                class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
            <Icon data={eye} scale={1.0}/>
        </button>
    {:else}
        {value}
        {#if !hideHiddenToggle}
            <button on:click={() => {hidden = !hidden;}}
                    class="cursor-pointer px-0.5 transition-opacity opacity-20 hover:opacity-100">
                <Icon data={eyeSlash} scale={1.0}/>
            </button>
        {/if}
    {/if}
{/if}
