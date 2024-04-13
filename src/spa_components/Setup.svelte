<script lang="ts">
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import InternalHrefLinkButton from "~spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import UnlockExtensionService from "~services/UnlockExtensionService";

    export let params: { isInPopup: string };
    let newExtensionUnlockPassword = '';
    let isExtensionUnlocked = false;
    let processNewUnlockPassword = false;

    async function setUnlockPassword() {
        processNewUnlockPassword = true;
        await UnlockExtensionService.setUpExtensionPassword(newExtensionUnlockPassword);
        isExtensionUnlocked = true;
        processNewUnlockPassword = false;
    }

    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }
</script>

<div class="flex h-full flex-col items-center justify-center space-y-4 p-10">
    <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
        {chrome.i18n.getMessage("welcome_to_passman")}
    </h2>
    <p>
        {chrome.i18n.getMessage("intro_text")}
    </p>
    <p>
        {chrome.i18n.getMessage("extra_accounts")}
    </p>

    {#if isExtensionUnlocked}
        {#if (params && params.isInPopup === '1')}
            <OnClickButton callback={openOptionsPage} title="{chrome.i18n.getMessage('begin')}">
                {chrome.i18n.getMessage("begin")} to options
            </OnClickButton>
        {:else}
            <InternalHrefLinkButton href="/setup/server">
                {chrome.i18n.getMessage("begin")} direct
            </InternalHrefLinkButton>
        {/if}
    {:else}
        <CustomInputField label="Set a new extension unlock password"
                          bind:value={newExtensionUnlockPassword}
                          tabindex="1"
                          type="password"/>
        <OnClickButton callback={setUnlockPassword} title="{chrome.i18n.getMessage('begin')}"
                       disabled={newExtensionUnlockPassword === '' || processNewUnlockPassword}>
            Save password & unlock
        </OnClickButton>
    {/if}
</div>
