<script lang="ts">
  import '@/style.css';
  import { onMount } from "svelte";
  import { routes } from "@/popupRoutes";
  // @ts-expect-error
  import Router, { push } from "@/Router.svelte";
  import extensionUnlockStateStore, { ExtensionUnlockState } from "@/stores/extensionUnlockStateStore";
  import BottomNavBar from "@/spa_partials/BottomNavBar.svelte";
  import Toaster from "@/spa_partials/Toaster.svelte";
  import Loading from '@/spa_components/Loading.svelte';
  import { sendMessage } from "@/entrypoints/background/messaging";

  onMount(async () => {
    sendMessage('getExtensionUnlockState').then((value) => {
      // use locked as initial state; will be overridden by the actual state right after the switch
      extensionUnlockStateStore.set(ExtensionUnlockState.LOCKED);

      switch (value.status) {
        case ExtensionUnlockState.NOT_SET_UP_YET:
          // setup required
          push('/setup/start/1');
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

{#if $extensionUnlockStateStore !== undefined}
  <div class="twp-passman-webextension h-[28rem] w-[28rem] text-sm overflow-y-auto">
    <Router {routes}/>
    <Toaster rootExtraClasses="mb-14" itemPadding="p-2" />
  </div>
{:else}
  <div class="twp-passman-webextension h-[28rem] w-[28rem] text-sm overflow-y-auto">
    <Loading/>
  </div>
{/if}

{#if $extensionUnlockStateStore === ExtensionUnlockState.UNLOCKED}
  <BottomNavBar/>
{/if}
