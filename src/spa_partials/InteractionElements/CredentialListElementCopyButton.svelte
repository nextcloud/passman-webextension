<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import type { IconType } from "svelte-awesome/package/components/Icon.svelte";
    import ClipboardService from "~services/frontend/ClipboardService";

    export let value: string | number;
    export let fieldName: string;
    export let icon: IconType;
    export let iconScale: number = 1.0;
    export let forceEnable: boolean = false;
    export let copy = () => {
        ClipboardService.copyToClipboardWithNotification(value.toString(), fieldName);
    }
</script>

{#if value || forceEnable}
    <button on:click={copy} title="Copy {fieldName} to clipboard" class="cursor-pointer px-0.5 hover:text-blue-700">
        <Icon data={icon} scale={iconScale}/>
    </button>
{:else}
    <button title="No {fieldName} to copy" class="cursor-default px-0.5 text-gray-300">
        <Icon data={icon} scale={iconScale}/>
    </button>
{/if}
