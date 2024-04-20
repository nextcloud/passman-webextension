<script lang="ts">
    import type { TagInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/TagInterface";

    export let tags: TagInterface[];
</script>

{#if tags}
    <div class="space-x-1">
        {#each tags as tag}
            {#if tag.text !== undefined}
                <div class="badge badge-outline h-fit">{tag.text}</div>
            {/if}
        {/each}
    </div>
{/if}
