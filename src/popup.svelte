<script lang="ts">
    import './style.css';
    import { onMount } from "svelte";
    import Router, { push } from "~Router.svelte";
    import { sha512 } from 'js-sha512';
    import { Storage } from "@plasmohq/storage";
    import { routes } from "~popupRoutes";
    import extensionUnlockPasswordStore from "~stores/extensionUnlockPasswordStore";
    import Toaster from 'svelte-french-toast/dist/components/Toaster.svelte';

    onMount(async () => {
        console.debug("isSecureContext", isSecureContext);
        let unsafeStorage = new Storage();
        unsafeStorage.get('extensionUnlockPasswordHash').then(async (storedExtensionUnlockPasswordHash: string | undefined) => {
            if (storedExtensionUnlockPasswordHash === undefined || storedExtensionUnlockPasswordHash === null || storedExtensionUnlockPasswordHash === '') {
                // setup required
                push('/setup/1');
            } else {
                // extension already set up
                const extensionUnlockPassword = $extensionUnlockPasswordStore;
                if (extensionUnlockPassword !== undefined && extensionUnlockPassword !== null) {
                    const extensionUnlockPasswordHash = sha512(extensionUnlockPassword);
                    if (storedExtensionUnlockPasswordHash === extensionUnlockPasswordHash) {
                        // correct unlock password already in memory / svelte store
                        push('/home');
                    } else {
                        // extension unlock required
                        push('/unlock');
                    }
                }
            }
        });
    });
</script>

<div class="h-[28rem] w-[28rem] text-sm">
    <Router {routes}/>
</div>
