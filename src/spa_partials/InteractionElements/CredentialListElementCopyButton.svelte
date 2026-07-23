<script lang="ts">
    import Icon from "svelte-awesome/components/Icon.svelte";
    import type { IconType } from "svelte-awesome/components/Icon.svelte";
    import ClipboardService from "~/services/frontend/ClipboardService";
    import { i18n } from "~/lib/i18n";

    export let value: string | number | null;
    export let fieldName: string;
    export let icon: IconType;
    export let iconScale: number = 1.0;
    export let forceEnable: boolean = false;
    export let copy = () => {
        if (value) {
            ClipboardService.copyToClipboardWithNotification(value.toString(), fieldName);
        }
    }
</script>

{#if value || forceEnable}
    <button on:click={copy} title="{i18n.getMessage('copy_to_clipboard', [fieldName])}" class="cursor-pointer px-0.5 hover:text-blue-700">
        <Icon data={icon} scale={iconScale}/>
    </button>
{:else}
    <button title="{i18n.getMessage('no_field_to_copy', [fieldName])}" class="cursor-default px-0.5 text-gray-300">
        <Icon data={icon} scale={iconScale}/>
    </button>
{/if}
