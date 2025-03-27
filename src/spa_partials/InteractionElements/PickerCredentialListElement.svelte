<script lang="ts">
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { LegacyFormManagerService } from "~services/frontend/LegacyFormManagerService";
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";

    export let decryptedPartialCredentialData: DecryptedPartialCredentialData;
    const callback = () => {
        LegacyFormManagerService.fillPassword(
            decryptedPartialCredentialData.username ?? decryptedPartialCredentialData.email ?? undefined,
            decryptedPartialCredentialData.password ?? undefined
        );
        PasswordPickerService.hidePicker();
    };
</script>

{#if (decryptedPartialCredentialData)}
    <div class="border-2 rounded-lg p-2 m-1 w-[93%] cursor-pointer" aria-hidden="true"
         on:click={callback} on:keypress={() => {}} title="Click to auto fill">
        <div class="flex space-x-1" style="padding-left: 2px;">
            <div class="flex flex-col truncate">
                <span class="truncate cursor-pointer" title="{decryptedPartialCredentialData.label}">
                    {decryptedPartialCredentialData.label}
                </span>
                <span class="text-gray-400 cursor-pointer">
                    {decryptedPartialCredentialData.username ?? (decryptedPartialCredentialData.email ?? '')}
                </span>
            </div>
        </div>
    </div>
{/if}
