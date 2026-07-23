<script lang="ts">
  import '@/style.css';
  import { onMount } from "svelte";
  import { routes } from "@/popupRoutes";
  // @ts-expect-error
  import Router, { push } from "@/Router.svelte";
  import extensionUnlockStateStore, { ExtensionUnlockState } from "@/stores/extensionUnlockStateStore";
  import BottomNavBar from "@/spa_partials/BottomNavBar.svelte";
  import Toaster from "@/spa_partials/Toaster.svelte";
  import { sendMessage } from "@/entrypoints/background/messaging";
  import { i18n } from "~/lib/i18n";

  onMount(async () => {
    sendMessage('getExtensionUnlockState').then((value) => {
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
          console.error(i18n.getMessage('unknown_error_checking_lock_state'));
          alert(i18n.getMessage('unknown_error_checking_lock_state'));
      }
      extensionUnlockStateStore.set(value.status);
    }, (error) => {
      console.error(error);
      alert(error);
    });
  });
</script>

<div class="twp-passman-webextension w-full h-screen flex flex-col justify-between">
  <div class="flex-1 overflow-y-auto m-auto w-[28rem] text-sm">
    <Router {routes}/>
  </div>
  {#if $extensionUnlockStateStore === ExtensionUnlockState.UNLOCKED}
    <div class="flex-shrink-0">
      <BottomNavBar/>
    </div>
  {/if}
</div>
<Toaster rootExtraClasses="mb-14" itemPadding="p-2" />
