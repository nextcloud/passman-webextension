<script lang="ts">
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";

    export let decryptedPartialCredentialData: DecryptedPartialCredentialData;
    export let callback = () => {
        undefined;
    };
</script>

{#if (decryptedPartialCredentialData)}
    <div class="border-2 rounded-lg p-1 m-1 w-[95%]">
        <div class="flex space-x-1" style="padding-left: 2px;">
            <div class="flex flex-col truncate cursor-pointer" aria-hidden="true"
                 on:click={callback} on:keypress={() => {}}>
                <span class="truncate" title="{decryptedPartialCredentialData.label}">
                    {decryptedPartialCredentialData.label}
                </span>
                <span class="text-gray-400">
                    {decryptedPartialCredentialData.username ?? (decryptedPartialCredentialData.email ?? '')}
                </span>
            </div>
        </div>
    </div>
{/if}
