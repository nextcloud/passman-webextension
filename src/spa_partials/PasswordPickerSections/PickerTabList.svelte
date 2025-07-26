<script lang="ts">
    import { PASSWORD_PICKER_SECTIONS, PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import { onMount } from "svelte";
    import PickerCredentialListElement from "~spa_partials/InteractionElements/PickerCredentialListElement.svelte";
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import { i18n } from "~lib/i18n";

    export let selectedSection: PASSWORD_PICKER_SECTIONS = PASSWORD_PICKER_SECTIONS.LIST;

    let allDecryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

    onMount(() => {
        allDecryptedPartialCredentialData = PasswordPickerService.decryptedPartialCredentialData;
    })
</script>

<div class="tab-list-content">
    {#if allDecryptedPartialCredentialData && allDecryptedPartialCredentialData.length > 0}
        <div class="flex flex-col items-center justify-center">
            {#each allDecryptedPartialCredentialData as decryptedPartialCredentialData (decryptedPartialCredentialData.guid)}
                <PickerCredentialListElement bind:decryptedPartialCredentialData/>
            {/each}
        </div>
    {:else}
        <div class="no-credentials">
            <div class="btn btn-secondary save" title="{i18n.getMessage("add_account")}" data-name="add" aria-hidden="true"
                on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.ADD}>
                {i18n.getMessage("add_account")}
            </div>
            <div class="clearfix"></div>
            <div class="btn btn-secondary search" title="{i18n.getMessage("search")}" data-name="search" aria-hidden="true"
                on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.SEARCH}>
                {i18n.getMessage("search")}
            </div>
            <div class="clearfix"></div>
            <div class="btn btn-secondary gen" title="generate_password" data-name="generate" aria-hidden="true"
                on:click={() => selectedSection = PASSWORD_PICKER_SECTIONS.GENERATE}>
                {i18n.getMessage("password_generator")}
            </div>
        </div>
    {/if}
</div>
