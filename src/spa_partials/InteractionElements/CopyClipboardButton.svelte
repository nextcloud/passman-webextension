<script lang="ts">
    import type { IconType } from "svelte-awesome/components/Icon.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import clipboard from "svelte-awesome/icons/clipboard";

    export let value: string;
    export let icon: IconType = clipboard;
    export let fieldTitle: string = '';
    export let buttonTitle: string = '';
    export let additionalClasses = '';

    function copyToClipboard(value: string, fieldTitle: string) {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            console.log(fieldTitle + ' copied to clipboard');
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            console.error('Failed to copy ' + fieldTitle);
        });
    }
</script>

{#if value && icon}
    <button on:click={() => copyToClipboard(value, fieldTitle)}
            title="{buttonTitle}"
            class="cursor-pointer px-0.5 {additionalClasses}">
        <Icon data={icon} scale={1.0}/>
    </button>
{/if}
