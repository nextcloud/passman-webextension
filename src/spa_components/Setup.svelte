<script lang="ts">
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import CustomInputField from "~/spa_partials/FormElements/CustomInputField.svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { i18n } from "~/lib/i18n";
    import browser from "webextension-polyfill";
    import passmanBlueWhiteImage from "~/assets/images/passman-blue-white.svg";
    import passmanImage from "~/assets/images/passman.svg";

    export let params: { isInPopup: string };

    let newExtensionUnlockPassword = '';
    let isExtensionUnlocked = false;
    let processNewUnlockPassword = false;

    async function setUnlockPassword() {
        processNewUnlockPassword = true;
        await ExtensionUnlockService.setUpExtensionPassword(newExtensionUnlockPassword);
        isExtensionUnlocked = true;
        processNewUnlockPassword = false;
        push('/setup/server');
    }

    function openOptionsPage() {
        browser.runtime.openOptionsPage();
    }
</script>

<div class="flex h-full flex-col items-center justify-center px-6 py-8">
    <div class="setup-fancy flex w-full max-w-sm flex-col items-center text-center">
        <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#007ac7] shadow-md shadow-[#007ac7]/25">
            <!-- <img src="{passmanImage}" class="h-12 w-12 dark:hidden" alt="{i18n.getMessage('extName')}"/>
            <img src="{passmanBlueWhiteImage}" class="hidden h-12 w-12 dark:block" alt="{i18n.getMessage('extName')}"/> -->
            <img src="{passmanImage}" class="h-12 w-12" alt="{i18n.getMessage('extName')}"/>
        </div>

        <h2 class="text-2xl font-bold tracking-tight text-gray-800">
            {i18n.getMessage("welcome_to_passman")}
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-gray-600">
            {i18n.getMessage("intro_text")}
        </p>

        <div class="mt-6 w-full">
            <!-- Popup closes too easily for multi-step setup — send users to the options page. -->
            {#if (params && params.isInPopup === '1')}
                <OnClickButton
                    callback={openOptionsPage}
                    title="{i18n.getMessage('begin')}"
                    additionalClasses="w-full border-primary text-primary hover:bg-primary hover:text-white"
                >
                    {i18n.getMessage("begin")}
                </OnClickButton>
            {:else if isExtensionUnlocked}
                <InternalHrefLinkButton
                    href="/setup/server"
                    additionalClasses="inline-flex w-full justify-center border-primary text-primary hover:bg-primary hover:text-white"
                >
                    {i18n.getMessage("begin")}
                </InternalHrefLinkButton>
            {:else}
                <form on:submit|preventDefault={setUnlockPassword}>
                    <div class="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm">
                        <CustomInputField
                            label="{i18n.getMessage('set_extension_unlock_password')}"
                            bind:value={newExtensionUnlockPassword}
                            tabindex={1}
                            type="password"
                        />
                        <p class="text-xs leading-snug text-gray-500">
                            {i18n.getMessage('setup_unlock_password_hint')}
                        </p>
                        <OnClickButton
                            callback={setUnlockPassword}
                            title="{i18n.getMessage('save_password_and_unlock')}"
                            disabled={newExtensionUnlockPassword === '' || processNewUnlockPassword}
                            additionalClasses="w-full border-primary text-primary hover:bg-primary hover:text-white"
                        >
                            {i18n.getMessage('save_password_and_unlock')}
                        </OnClickButton>
                    </div>
                </form>
            {/if}
        </div>

        <div class="mt-5 w-full rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-left">
            <div class="flex gap-2.5">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                </svg>
                <p class="text-xs leading-relaxed text-amber-800">
                    {@html i18n.getMessage('setup_dev_warning', [
                        '<br>',
                        '<a href="https://github.com/nextcloud/passman-webextension/issues" target="_blank" class="font-medium underline underline-offset-2 hover:text-amber-950 transition-colors">',
                        '</a>'
                    ])}
                </p>
            </div>
        </div>
    </div>
</div>

<style>
    .setup-fancy {
        animation: setup-fancy-in 420ms ease-out both;
    }

    @keyframes setup-fancy-in {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
