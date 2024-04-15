<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import CredentialIcon from "~spa_partials/CredentialIcon.svelte";
    import { clockO, envelopeO, key, userO } from "svelte-awesome/package/icons";
    import CredentialListElementCopyButton
        from "~spa_partials/InteractionElements/CredentialListElementCopyButton.svelte";
    import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
    import ClipboardService from "~services/ClipboardService";

    export let credential: Credential;

    const copyOTPToClipboard = () => {
        ClipboardService.copyToClipboard(OTPService.updateOTP(credential.otp), 'OTP');
    }
</script>

{#if (credential)}
    <div class="flex border-2 rounded-lg p-1 m-1 space-x-1 w-[95%]">
        <div class="basis-1/12 flex items-center justify-center">
            <CredentialIcon credential="{credential}" isSmall="true"
                            additionalClasses="align-center"/>
        </div>
        <div class="basis-7/12 flex flex-col truncate">
            <span class="truncate" title="{credential.label}">
                {credential.label}
            </span>
            <span class="text-gray-400">
                {credential.username ?? (credential.email ?? '')}
            </span>
        </div>
        <div class="basis-4/12 flex items-center justify-end space-x-2 pe-2">
            <CredentialListElementCopyButton bind:value={credential.username} fieldName="username" icon={userO}/>
            <CredentialListElementCopyButton bind:value={credential.email} fieldName="email" icon={envelopeO}/>
            <CredentialListElementCopyButton bind:value={credential.password} fieldName="password" icon={key}/>
            <CredentialListElementCopyButton value={null} copy={copyOTPToClipboard}
                                             forceEnable={credential.otp != null && credential.otp.secret != null}
                                             fieldName="OTP" icon={clockO} iconScale={1.2}/>
        </div>
    </div>
{/if}
