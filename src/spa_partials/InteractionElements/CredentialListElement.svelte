<script lang="ts">
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type {
        DecryptedPartialCredentialData
    } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import CredentialIcon from "~/spa_partials/CredentialIcon.svelte";
    import { clockO, envelopeO, key, pencil, userO } from "svelte-awesome/icons";
    import CredentialListElementCopyButton
        from "~/spa_partials/InteractionElements/CredentialListElementCopyButton.svelte";
    import { OTPService } from "@binsky/passman-client-ts/lib/Service/OTPService";
    import ClipboardService from "~/services/frontend/ClipboardService";
    import Icon from "svelte-awesome/components/Icon.svelte";
    // @ts-expect-error
    import { link } from "~/Router.svelte";
    import CredentialDetails from "~/spa_partials/CredentialDetails.svelte";
    import InlineMiniLoading from "~/spa_components/LineLoading.svelte";
    import { i18n } from "~/lib/i18n";

    type Props = {
        decryptedPartialCredentialData: DecryptedPartialCredentialData;
        onCredChangedCallback: () => void;
        expanded: boolean;
        hydratedCredential: Credential | null;
        onToggleExpand: (guid: string) => void;
        ensureHydrated: (guid: string) => Promise<Credential | null>;
    };

    let {
        decryptedPartialCredentialData,
        onCredChangedCallback,
        expanded,
        hydratedCredential,
        onToggleExpand,
        ensureHydrated
    }: Props = $props();

    const editLink = $derived('/credential/edit/' + decryptedPartialCredentialData.guid);
    const fakeCredentialObjectForIcon = $derived({
        icon: decryptedPartialCredentialData.icon,
        acl: decryptedPartialCredentialData.is_shared_with_others ?? false,
        shared_key: decryptedPartialCredentialData.is_shared_with_me ?? false
    } as unknown as Credential);
    const hasOtp = $derived(
        decryptedPartialCredentialData.otp != null && decryptedPartialCredentialData.otp !== ''
    );

    const copyOTPToClipboard = async () => {
        const credential = await ensureHydrated(decryptedPartialCredentialData.guid);
        if (!credential) {
            return;
        }
        ClipboardService.copyToClipboardWithNotification(
            OTPService.updateOTP(credential.otp),
            'OTP'
        );
    };

    const toggleExpandedCredentialView = () => {
        onToggleExpand(decryptedPartialCredentialData.guid);
    };
</script>

{#if decryptedPartialCredentialData}
    <div class="border-2 border-gray-200 dark:border-gray-500 rounded-lg p-1 w-[95%]">
        <div class="flex space-x-1 h-[40px]">
            <div class="basis-1/12 flex items-center justify-center cursor-pointer max-h-[40px]" role="button" tabindex="0"
                 onclick={toggleExpandedCredentialView} onkeypress={toggleExpandedCredentialView}>
                <CredentialIcon credential={fakeCredentialObjectForIcon} isSmall="true"
                                additionalClasses="align-center max-h-[40px]"/>
            </div>
            <div class="basis-7/12 flex flex-col truncate cursor-pointer" role="button" tabindex="0"
                 onclick={toggleExpandedCredentialView} onkeypress={toggleExpandedCredentialView}>
                <span class="truncate" title="{decryptedPartialCredentialData.label}">
                    {decryptedPartialCredentialData.label}
                </span>
                <span class="truncate text-gray-400">
                    {(decryptedPartialCredentialData.username || decryptedPartialCredentialData.email) || ''}
                </span>
            </div>
            <div class="basis-4/12 flex items-center justify-end space-x-2 pe-[.4rem]">
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.username} fieldName={i18n.getMessage('username')} icon={userO}/>
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.email} fieldName={i18n.getMessage('email')} icon={envelopeO}/>
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.password} fieldName={i18n.getMessage('password')} icon={key}/>
                <CredentialListElementCopyButton value={null} copy={copyOTPToClipboard}
                                                 forceEnable={hasOtp}
                                                 fieldName={i18n.getMessage('one_time_password')} icon={clockO} iconScale={1.2}/>
                {#if decryptedPartialCredentialData.can_write}
                    <a title="{i18n.getMessage('edit_credential')}"
                       class="cursor-pointer px-0.5 hover:text-blue-700"
                       href="{editLink}"
                       use:link={editLink}>
                        <Icon data={pencil} scale={1.2}/>
                    </a>
                {:else}
                <span title="{i18n.getMessage('edit_insufficient_permissions')}" class="px-0.5 text-gray-300">
                    <Icon data={pencil} scale={1.2}/>
                </span>
                {/if}
            </div>
        </div>

        {#if expanded}
            <div class="border-t border-gray-200 dark:border-gray-500 mt-1 p-1 space-y-1.5">
                {#if hydratedCredential}
                    <CredentialDetails credential={hydratedCredential} {onCredChangedCallback}/>
                {:else}
                    <InlineMiniLoading/>
                {/if}
            </div>
        {/if}
    </div>
{/if}
