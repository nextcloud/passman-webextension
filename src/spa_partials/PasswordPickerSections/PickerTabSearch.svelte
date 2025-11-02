<script lang="ts">
    import type { GetCredentialsListMessagingResponse } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { PasswordPickerService } from "~/services/frontend/PasswordPickerService";
    import PickerCredentialListElement from "~/spa_partials/InteractionElements/PickerCredentialListElement.svelte";
    import { i18n } from "~/lib/i18n";

    let searchResponse: GetCredentialsListMessagingResponse | null = null;

    const searchInputCallback = (event: Event) => {
        const searchInput = (event.target as HTMLInputElement).value;
        PasswordPickerService.searchCredentialsForPicker(searchInput).then((value) => {
            searchResponse = value;
        });
    }
</script>

<div class="tab-search-content">
    <div class="flex flex-col items-center justify-center">
        <span style="font-weight: 600; width: 100%; text-align: left;" class="mb-2">{i18n.getMessage("search_for")}:</span>
        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900
            text-sm transition-all duration-200 ease-in-out focus:outline-none focus:border-primary focus:ring-2
            focus:ring-primary/10" id="password_search" style="margin-bottom: 5px;"
            title={i18n.getMessage("search_for")} on:input={searchInputCallback}
        >
        {#if searchResponse}
            {#key searchResponse}
                {#each searchResponse.decryptedPartialCredentialData as decryptedPartialCredentialData (decryptedPartialCredentialData.guid)}
                    <PickerCredentialListElement bind:decryptedPartialCredentialData/>
                {/each}
            {/key}
        {/if}
    </div>
</div>
