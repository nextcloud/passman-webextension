<script lang="ts">
    import { i18n } from "~/lib/i18n";
    import ClipboardService from "~/services/frontend/ClipboardService";

    export let originalJson: string | undefined = undefined;
    /** When the parent already draws a divider above this block, skip the component's own one. */
    export let divided: boolean = true;
</script>

<div class="{divided ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-600' : ''} space-y-2">
    <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-medium">{i18n.getMessage('vault_recovery_original_json_title')}</p>
        {#if originalJson}
            <button
                type="button"
                class="text-xs text-primary hover:underline cursor-pointer"
                onclick={() => ClipboardService.copyToClipboardWithNotification(originalJson ?? '', i18n.getMessage('vault_recovery_original_json_title'))}
            >
                {i18n.getMessage('vault_recovery_copy_json')}
            </button>
        {/if}
    </div>
    <pre class="text-xs font-mono whitespace-pre-wrap break-all max-h-80 overflow-y-auto p-2 rounded bg-black/5 dark:bg-black/40">{originalJson}</pre>
</div>
