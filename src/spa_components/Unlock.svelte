<script lang="ts">
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import ShowGenericErrors from "~spa_partials/FormElements/ShowGenericErrors.svelte";
    import { push } from "~Router.svelte";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import { sendToBackground } from "@plasmohq/messaging";
    import Loading from "./Loading.svelte";
    import { onMount } from "svelte";

    const i18n = chrome.i18n;
    let extensionUnlockPassword = '';
    let errors: string[] = [];
    let inUnlockRequest = false;
    let extensionUnlockPasswordInputRef: HTMLInputElement | undefined;

    const unlockOnFormEvent = (event: Event) => {
        event.preventDefault();
        unlock(true);
    }
    const unlock = (refreshAfterUnlock = true) => {
        if (!inUnlockRequest) {
            inUnlockRequest = true;
            sendToBackground({
                name: "unlockExtension",
                body: {
                    extensionUnlockPassword,
                    refreshAfterUnlock
                }
            }).then((value) => {
                if (value.status) {
                    push('/home');
                    $extensionUnlockStateStore = ExtensionUnlockState.UNLOCKED;
                } else {
                    errors = [
                        chrome.i18n.getMessage("invalid_master_password")
                    ];
                    $extensionUnlockStateStore = ExtensionUnlockState.LOCKED;
                }
                inUnlockRequest = false;
            });
        }
    };

    onMount(() => {
        if (extensionUnlockPasswordInputRef) {
            extensionUnlockPasswordInputRef.focus();
        }
    });
</script>

<form on:submit|preventDefault={unlockOnFormEvent}>
    <div class="h-full flex flex-col items-center justify-center space-y-4 p-10">
        {#if inUnlockRequest}
            <Loading/>
        {:else}
            <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
                {i18n.getMessage("extension_locked")}
            </h2>

            <CustomInputField placeholder="{i18n.getMessage('password')}" label=""
                bind:value={extensionUnlockPassword} 
                tabindex={1}
                type="password"
                bind:ref={extensionUnlockPasswordInputRef}
            />
            <ShowGenericErrors bind:errors/>
            <div class="flex space-x-2 justify-center items-center">
                <OnClickButton callback={unlock} title="{i18n.getMessage('unlock')}" tabindex="2" 
                    disabled={extensionUnlockPassword === '' || inUnlockRequest} additionalClasses="hover:border-blue-500"
                >
                    {i18n.getMessage("unlock")}
                </OnClickButton>
                <OnClickButton callback={() => unlock(false)} title="{i18n.getMessage('unlock_without_refresh')}" tabindex="2" 
                    disabled={extensionUnlockPassword === '' || inUnlockRequest} small={true}
                    additionalClasses="py-1 text-xs h-fit hover:border-blue-500"
                >
                    {i18n.getMessage("unlock_without_refresh")}
                </OnClickButton>
            </div>
        {/if}
    </div>
</form>
