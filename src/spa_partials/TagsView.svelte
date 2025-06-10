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

<style>
    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
        transition-duration: 200ms;
        height: 1.25rem /* 20px */;
        font-size: 0.875rem /* 14px */;
        line-height: 1.25rem /* 20px */;
        width: fit-content;
        padding-left: 0.563rem /* 9.008px */;
        padding-right: 0.563rem /* 9.008px */;
        border-width: 1px;
        --tw-border-opacity: 1;
        border-color: hsl(var(--b2) / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: hsl(var(--b1) / var(--tw-bg-opacity));
        --tw-text-opacity: 1;
        color: hsl(var(--bc) / var(--tw-text-opacity));
        border-radius: var(--rounded-badge, 1.9rem /* 30.4px */);

        margin: 0.125rem;
    }
    :where(.menu li) .badge {
        justify-self: end;
    }

    .badge-outline {
        border-color: currentColor;
        --tw-border-opacity: 0.5;
        background-color: transparent;
        color: currentColor;
    }
</style>
