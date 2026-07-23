<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type {
        DecryptedPartialCredentialData
    } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { LegacyFormManagerService } from "~/services/frontend/LegacyFormManagerService";
    import { PasswordPickerService } from "~/services/frontend/PasswordPickerService";
    import CredentialIcon from "~/spa_partials/CredentialIcon.svelte";
    import { i18n } from "~/lib/i18n";

    export let decryptedPartialCredentialData: DecryptedPartialCredentialData;
    export let enableEmailAsUsernameFallbackFilling: boolean;

    let fakeCredentialObjectForIcon = {
        icon: decryptedPartialCredentialData.icon,
        acl: decryptedPartialCredentialData.is_shared_with_others ?? false,
        shared_key: decryptedPartialCredentialData.is_shared_with_me ?? false
    } as unknown as Credential;

    const callback = () => {
        LegacyFormManagerService.fillFields(
            decryptedPartialCredentialData.username ?? undefined,
            decryptedPartialCredentialData.email ?? undefined,
            decryptedPartialCredentialData.password ?? undefined,
            decryptedPartialCredentialData.otp ?? undefined,
            enableEmailAsUsernameFallbackFilling
        );
        PasswordPickerService.hidePicker();
    };
</script>

{#if (decryptedPartialCredentialData)}
    <div class="border-2 rounded-lg p-2 my-1 w-full cursor-pointer" aria-hidden="true"
         on:click={callback} on:keypress={() => {}} title="{i18n.getMessage('click_to_auto_fill')}">
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
