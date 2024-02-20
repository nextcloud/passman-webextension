<script lang="ts">
    import './style.css';

    import Toaster from 'svelte-french-toast/dist/components/Toaster.svelte';

    import IndexPage from '~pages/IndexPage.svelte';
    import { SecureStorage } from "@plasmohq/storage/dist/secure";
    import { onMount } from "svelte";

    let storage: SecureStorage;

    onMount(async () => {
        console.log("isSecureContext", isSecureContext);
        const myStorage = new SecureStorage();
        await myStorage.setPassword("roosevelt");
        storage = myStorage;
    });
</script>

<div class="h-[28rem] w-[28rem]">
    {#if (storage)}
        <IndexPage bind:storage/>
        <Toaster/>
    {/if}
</div>
