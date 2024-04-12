<script lang="ts">
    export let errors: string[] = [];
</script>

{#each errors as error}
    <span class="text-red-600 text-xs">{error}</span>
{/each}
