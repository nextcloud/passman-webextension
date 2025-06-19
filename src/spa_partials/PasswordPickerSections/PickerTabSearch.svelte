<script lang="ts">
    import type { GetCredentialsListMessagingResponse } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import PickerCredentialListElement from "~spa_partials/InteractionElements/PickerCredentialListElement.svelte";

    const i18n = chrome.i18n;
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
        <span style="font-weight: 600; width: 100%; text-align: left;">{i18n.getMessage("search_for")}:</span>
        <input type="text" class="input" id="password_search" style="margin-bottom: 5px;"
            title={i18n.getMessage("search_for")} on:input={searchInputCallback}>
        {#if searchResponse}
            {#each searchResponse.decryptedPartialCredentialData as decryptedPartialCredentialData (decryptedPartialCredentialData.guid)}
                <PickerCredentialListElement bind:decryptedPartialCredentialData/>
            {/each}
        {/if}
    </div>
</div>
