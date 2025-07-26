<script lang="ts">
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import InternalHrefLinkButton from "~spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import ExtensionUnlockService from "~services/ExtensionUnlockService";
    import { push } from "~Router.svelte";
    import { i18n } from "~lib/i18n";
    import browser from "webextension-polyfill";

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

<div class="flex h-full flex-col items-center justify-center space-y-4 p-10">
    <h2 class="text-2xl font-semibold text-gray-700 text-center mb-2">
        {i18n.getMessage("welcome_to_passman")}
    </h2>
    <p>
        {i18n.getMessage("intro_text")}
    </p>
    <!--no support planned for extra accounts {i18n.getMessage("extra_accounts")} -->
    <div class="bg-amber-50 border-l-4 border-amber-400 py-3 px-2 my-4 rounded-r-lg shadow-sm">
        <div class="flex">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="ml-3">
                <p class="text-sm text-amber-700">
                    This extension is under active development.<br>
                    There will be bugs, but you can help fix them!
                    You are welcome to open an issue on <a href="https://gitlab.com/binsky08/passman-webextension-v3/-/issues" target="_blank" class="font-medium underline hover:text-amber-800 transition-colors">GitLab</a>.
                    <br>
                    As soon as the extension is stable, I will provide it as an update to the existing Passman extension.
                </p>
            </div>
        </div>
    </div>

    <!-- we are not doing setup in the small popup that closes when clicking somewhere outside of it; bad user experience -->
    {#if (params && params.isInPopup === '1')}
        <OnClickButton callback={openOptionsPage} title="{i18n.getMessage('begin')}">
            {i18n.getMessage("begin")}
        </OnClickButton>
    {:else}
        {#if isExtensionUnlocked}
            <InternalHrefLinkButton href="/setup/server">
                {i18n.getMessage("begin")}
            </InternalHrefLinkButton>
        {:else}
            <CustomInputField label="Set a new extension unlock password"
                            bind:value={newExtensionUnlockPassword}
                            tabindex={1}
                            type="password"/>
            <OnClickButton callback={setUnlockPassword} title="{i18n.getMessage('begin')}"
                        disabled={newExtensionUnlockPassword === '' || processNewUnlockPassword}>
                <!-- TODO: i18n -->
                Save password & unlock
            </OnClickButton>
        {/if}
    {/if}
</div>
