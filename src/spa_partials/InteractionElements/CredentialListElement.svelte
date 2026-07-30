<script lang="ts">
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import type {
        DecryptedPartialCredentialData
    } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import type { GetCredentialsForVaultMessagingResponse } from "~/entrypoints/background/messages/getCredentialsForVault";
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
    import NotyService from "~/services/frontend/NotyService";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import { i18n } from "~/lib/i18n";

    type Props = {
        decryptedPartialCredentialData: DecryptedPartialCredentialData;
        vault: Vault;
        onCredChangedCallback: () => void;
    };

    let {
        decryptedPartialCredentialData,
        vault,
        onCredChangedCallback
    }: Props = $props();

    let showExpandedView = $state(false);
    let hydrating = $state(false);
    let hydratedCredential = $state<Credential | null>(null);
    let hydratePromise: Promise<Credential | null> | null = null;

    const editLink = $derived('/credential/edit/' + decryptedPartialCredentialData.guid);
    const fakeCredentialObjectForIcon = $derived({
        icon: decryptedPartialCredentialData.icon,
        acl: decryptedPartialCredentialData.is_shared_with_others ?? false,
        shared_key: decryptedPartialCredentialData.is_shared_with_me ?? false
    } as unknown as Credential);
    const hasOtp = $derived(
        decryptedPartialCredentialData.otp != null && decryptedPartialCredentialData.otp !== ''
    );

    const hydrateCredential = (): Promise<Credential | null> => {
        if (hydratedCredential) {
            return Promise.resolve(hydratedCredential);
        }
        if (hydratePromise) {
            return hydratePromise;
        }

        hydratePromise = (async () => {
            hydrating = true;
            try {
                const response: GetCredentialsForVaultMessagingResponse = await sendMessage(
                    'getCredentialsForVault',
                    {
                        getCachedIfPossible: true,
                        guid: decryptedPartialCredentialData.guid
                    }
                );
                if (response.status && response.serializedCredentials.length > 0) {
                    hydratedCredential = Credential.fromSerializable(
                        response.serializedCredentials[0],
                        vault,
                        vault.getServer()
                    );
                    return hydratedCredential;
                }

                NotyService.notyError(
                    response.errorMessage ?? i18n.getMessage('could_not_find_selected_credential')
                );
                showExpandedView = false;
                return null;
            } catch (e) {
                NotyService.notyError(i18n.getMessage('could_not_find_selected_credential'));
                showExpandedView = false;
                return null;
            } finally {
                hydrating = false;
                hydratePromise = null;
            }
        })();

        return hydratePromise;
    };

    const copyOTPToClipboard = async () => {
        const credential = await hydrateCredential();
        if (!credential) {
            return;
        }
        ClipboardService.copyToClipboardWithNotification(
            OTPService.updateOTP(credential.otp),
            'OTP'
        );
    };

    const toggleExpandedCredentialView = () => {
        showExpandedView = !showExpandedView;
        if (showExpandedView) {
            void hydrateCredential();
        }
    };
</script>

{#if decryptedPartialCredentialData}
    <div class="border-2 border-gray-200 dark:border-gray-500 rounded-lg p-1 m-1 w-[95%]">
        <div class="flex space-x-1">
            <div class="basis-1/12 flex items-center justify-center cursor-pointer" role="button" tabindex="0"
                 onclick={toggleExpandedCredentialView} onkeypress={toggleExpandedCredentialView}>
                <CredentialIcon credential={fakeCredentialObjectForIcon} isSmall="true"
                                additionalClasses="align-center"/>
            </div>
            <div class="basis-7/12 flex flex-col truncate cursor-pointer" role="button" tabindex="0"
                 onclick={toggleExpandedCredentialView} onkeypress={toggleExpandedCredentialView}>
                <span class="truncate" title="{decryptedPartialCredentialData.label}">
                    {decryptedPartialCredentialData.label}
                </span>
                <span class="text-gray-400">
                    {decryptedPartialCredentialData.username ?? (decryptedPartialCredentialData.email ?? '')}
                </span>
            </div>
            <div class="basis-4/12 flex items-center justify-end space-x-2 pe-[.4rem]">
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.username} fieldName="username" icon={userO}/>
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.email} fieldName="email" icon={envelopeO}/>
                <CredentialListElementCopyButton value={decryptedPartialCredentialData.password} fieldName="password" icon={key}/>
                <CredentialListElementCopyButton value={null} copy={copyOTPToClipboard}
                                                 forceEnable={hasOtp}
                                                 fieldName="OTP" icon={clockO} iconScale={1.2}/>
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

        {#if showExpandedView}
            <div class="border-t border-gray-200 dark:border-gray-500 mt-1 p-1 space-y-1.5">
                {#if hydratedCredential}
                    <CredentialDetails bind:credential={hydratedCredential} {onCredChangedCallback}/>
                {:else}
                    <InlineMiniLoading/>
                {/if}
            </div>
        {/if}
    </div>
{/if}
