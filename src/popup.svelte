<script lang="ts">
    import './style.css';
    import { onMount } from "svelte";
    import { routes } from "~popupRoutes";
    import Router, { push } from "~Router.svelte";
    import { sendToBackground } from "@plasmohq/messaging";
    import { ExtensionUnlockState } from "~stores/extensionUnlockPasswordStore";
    import search from "svelte-awesome/package/icons/search";
    import Icon from "svelte-awesome/package/components/Icon.svelte";
    import InternalHrefLinkButton from "~spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
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
        }, (error) => {
            console.error(error);
            alert(error);
        });
    });
</script>

<div class="h-[28rem] w-[28rem] text-sm overflow-y-auto">
    <Router {routes}/>
</div>
<BottomNavBar />
