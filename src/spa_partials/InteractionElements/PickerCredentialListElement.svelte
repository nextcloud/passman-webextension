<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { LegacyFormManagerService } from "~services/frontend/LegacyFormManagerService";
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import CredentialIcon from "~spa_partials/CredentialIcon.svelte";

    export let decryptedPartialCredentialData: DecryptedPartialCredentialData;
    let fakeCredentialObjectForIcon = {
        icon: decryptedPartialCredentialData.icon,
        acl: decryptedPartialCredentialData.is_shared_with_others,
        shared_key: decryptedPartialCredentialData.is_shared_with_me
    } as unknown as Credential;

    const callback = () => {
        LegacyFormManagerService.fillPassword(
            decryptedPartialCredentialData.username ?? decryptedPartialCredentialData.email ?? undefined,
            decryptedPartialCredentialData.password ?? undefined
        );
        PasswordPickerService.hidePicker();
    };
</script>

{#if (decryptedPartialCredentialData)}
    <div class="border-2 rounded-lg p-2 m-1 w-[98%] cursor-pointer" aria-hidden="true"
         on:click={callback} on:keypress={() => {}} title="Click to auto fill">
        <div class="flex space-x-1" style="padding-left: 2px;">
            <div class="basis-2/12 flex items-center justify-center cursor-pointer">
                <CredentialIcon credential="{fakeCredentialObjectForIcon}" isSmall="false" bigScaleIconNumber={2}
                                additionalClasses="align-center w-8"/>
            </div>
            <div class="basis-10/12 flex flex-col truncate">
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
