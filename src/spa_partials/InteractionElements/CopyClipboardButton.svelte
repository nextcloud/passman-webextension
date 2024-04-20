<script lang="ts">
    import type { IconType } from "svelte-awesome/components/Icon.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import clipboard from "svelte-awesome/icons/clipboard";
    import ClipboardService from "~services/frontend/ClipboardService";

    export let value: string;
    export let icon: IconType = clipboard;
    export let iconScale: number = 1.0;
    export let fieldTitle: string = '';
    export let buttonTitle: string = '';
    export let additionalClasses = '';
</script>

{#if value && icon}
    <button on:click={() => ClipboardService.copyToClipboard(value, fieldTitle)}
            title="{buttonTitle}"
            class="cursor-pointer px-0.5 {additionalClasses}">
        <Icon data={icon} scale={iconScale}/>
    </button>
{/if}
