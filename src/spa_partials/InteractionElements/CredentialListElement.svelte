<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import CredentialIcon from "~spa_partials/CredentialIcon.svelte";
    import { clockO, envelopeO, key, pencil, userO } from "svelte-awesome/package/icons";
    import CredentialListElementCopyButton
        from "~spa_partials/InteractionElements/CredentialListElementCopyButton.svelte";
    import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
    import ClipboardService from "~services/frontend/ClipboardService";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { link } from "~Router.svelte";
    import { onMount } from "svelte";
    import { SharingACL } from "@binsky/passman-client-ts/lib/Model/SharingACL";
    import CredentialDetails from "~spa_partials/CredentialDetails.svelte";

    export let credential: Credential;
    let editLink = '';
    let showExpandedView = false;

    const copyOTPToClipboard = () => {
        ClipboardService.copyToClipboardWithNotification(OTPService.updateOTP(credential.otp), 'OTP');
    }

    const toggleExpandedCredentialView = () => {
        showExpandedView = !showExpandedView;
    }

    onMount(() => {
        editLink = '/credential/edit/' + credential.guid;
    })
</script>

{#if (credential && editLink !== '')}
    <div class="border-2 rounded-lg p-1 m-1 w-[95%]">
        <div class="flex space-x-1">
            <div class="basis-1/12 flex items-center justify-center cursor-pointer" role="button" tabindex="0"
                 on:click={toggleExpandedCredentialView} on:keypress={toggleExpandedCredentialView}>
                <CredentialIcon credential="{credential}" isSmall="true"
                                additionalClasses="align-center"/>
            </div>
            <div class="basis-7/12 flex flex-col truncate cursor-pointer" role="button" tabindex="0"
                 on:click={toggleExpandedCredentialView} on:keypress={toggleExpandedCredentialView}>
                <span class="truncate" title="{credential.label}">
                    {credential.label}
                </span>
                <span class="text-gray-400">
                    {credential.username ?? (credential.email ?? '')}
                </span>
            </div>
            <div class="basis-4/12 flex items-center justify-end space-x-2 pe-[.4rem]">
                <CredentialListElementCopyButton bind:value={credential.username} fieldName="username" icon={userO}/>
                <CredentialListElementCopyButton bind:value={credential.email} fieldName="email" icon={envelopeO}/>
                <CredentialListElementCopyButton bind:value={credential.password} fieldName="password" icon={key}/>
                <CredentialListElementCopyButton value={null} copy={copyOTPToClipboard}
                                                 forceEnable={credential.otp != null && credential.otp.secret != null}
                                                 fieldName="OTP" icon={clockO} iconScale={1.2}/>
                {#if credential.acl === undefined || credential.acl.permissions.hasPermission(SharingACL.permissions.WRITE)}
                    <a title="{chrome.i18n.getMessage('edit_credential')}"
                       class="cursor-pointer px-0.5 hover:text-blue-700"
                       href="{editLink}"
                       use:link={editLink}>
                        <Icon data={pencil} scale={1.2}/>
                    </a>
                {:else}
                <span title="{chrome.i18n.getMessage('edit_insufficient_permissions')}" class="px-0.5 text-gray-300">
                    <Icon data={pencil} scale={1.2}/>
                </span>
                {/if}
            </div>
        </div>

        {#if showExpandedView}
            <div class="border-t mt-1 p-1 space-y-1.5">
                <CredentialDetails bind:credential/>
            </div>
        {/if}
    </div>
{/if}
