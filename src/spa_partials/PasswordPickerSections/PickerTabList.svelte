<script lang="ts">
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import { onMount } from "svelte";
    import PickerCredentialListElement from "~spa_partials/InteractionElements/PickerCredentialListElement.svelte";
    import type {
        DecryptedPartialCredentialData
    } from "~background/messages/getPartiallyDecryptedFilteredCredentialsList";

    let allDecryptedPartialCredentialData: DecryptedPartialCredentialData[] = [];

    onMount(() => {
        allDecryptedPartialCredentialData = PasswordPickerService.decryptedPartialCredentialData;
    })
</script>

<div class="tab-list-content">
    {#if allDecryptedPartialCredentialData && allDecryptedPartialCredentialData.length > 0}
        <div class="flex flex-col items-center justify-center">
            {#each allDecryptedPartialCredentialData as decryptedPartialCredentialData}
                <PickerCredentialListElement bind:decryptedPartialCredentialData/>
            {/each}
        </div>
    {:else}
        <div class="no-credentials">
            <div class="btn btn-secondary save" title="btn_save_site"></div>
            <div class="clearfix"></div>
            <div class="btn btn-secondary search" title="btn_search"></div>
            <div class="clearfix"></div>
            <div class="btn btn-secondary gen" title="generate_password"></div>
        </div>
    {/if}
</div>
