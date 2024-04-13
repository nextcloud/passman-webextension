<script lang="ts">
    import './style.css';
    import { onMount } from "svelte";
    import { routes } from "~popupRoutes";
    import Router, { push } from "~Router.svelte";
    import { sendToBackground } from "@plasmohq/messaging";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import BottomNavBar from "~spa_partials/BottomNavBar.svelte";

    onMount(async () => {
        sendToBackground({
            name: "getExtensionUnlockState"
        }).then((value) => {
            switch (value.status) {
                case ExtensionUnlockState.NOT_SET_UP_YET:
                    // setup required
                    push('/setup/start/0');
                    break;
                case ExtensionUnlockState.LOCKED:
                    // extension unlock required
                    push('/unlock');
                    break;
                case ExtensionUnlockState.UNLOCKED:
                    // correct unlock password already in session
                    push('/home');
                    break;
                default:
                    console.error("Unknown error while checking extension lock state!");
                    alert("Unknown error while checking extension lock state!");
            }
            $extensionUnlockStateStore = value.status;
        }, (error) => {
            console.error(error);
            alert(error);
        });
    });
</script>

<div class="w-full h-screen text-center overflow-y-auto flex flex-col justify-between">
    <div class="m-auto w-[28rem] text-sm my-8">
        <Router {routes}/>
    </div>
    {#if $extensionUnlockStateStore === ExtensionUnlockState.UNLOCKED}
        <BottomNavBar/>
    {/if}
</div>
