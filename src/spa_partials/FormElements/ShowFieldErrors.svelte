<script lang="ts">
    import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";

    export let errors: IFormFieldError[] = [];
    export let showForName = '';
</script>

{#each errors as errorGroup}
    {#if errorGroup.field === showForName}
        {#each errorGroup.error as error}
            <span class="text-red-600 text-xs">{error}</span>
        {/each}
    {/if}
{/each}
