<script lang="ts">
    export let params: { isInPopup: string };

    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }
</script>

<div class="flex min-h-screen flex-col items-center justify-center space-y-4 p-10">
    <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
        {chrome.i18n.getMessage("welcome_to_passman")}
    </h2>
    <p>
        {chrome.i18n.getMessage("intro_text")}
    </p>
    <p>
        {chrome.i18n.getMessage("extra_accounts")}
    </p>

    {#if (params && params.isInPopup === '1')}
        <button on:click={openOptionsPage}>{chrome.i18n.getMessage("begin")} to options</button>
    {:else}
        <button on:click={openOptionsPage}>{chrome.i18n.getMessage("begin")} direct</button>
    {/if}
</div>
