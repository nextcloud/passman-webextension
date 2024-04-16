<script lang="ts">
    import { onMount } from "svelte";

    export let params: { guid?: string } = {};
    console.debug("Credential edit");

    onMount(() => {
        console.debug(params);
    });
</script>

Credential edit
{#if params.guid}
    {params.guid}
{/if}
