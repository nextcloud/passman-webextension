<script lang="ts">
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import ShowGenericErrors from "~spa_partials/FormElements/ShowGenericErrors.svelte";
    import { push } from "~Router.svelte";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import { sendToBackground } from "@plasmohq/messaging";

    const i18n = chrome.i18n;
    let extensionUnlockPassword = '';
    let errors: string[] = [];
    let inUnlockRequest = false;

    const unlock = () => {
        if (!inUnlockRequest) {
            inUnlockRequest = true;
            sendToBackground({
                name: "unlockExtension",
                body: {
                    extensionUnlockPassword
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
</script>

<form on:submit|preventDefault={unlock}>
    <div class="h-full flex flex-col items-center justify-center space-y-4 p-10">
        <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
            {i18n.getMessage("extension_locked")}
        </h2>

        <CustomInputField placeholder="{i18n.getMessage('password')}" label=""
                          bind:value={extensionUnlockPassword}
                          tabindex="1"
                          type="password"/>
        <ShowGenericErrors bind:errors/>
        <OnClickButton callback={unlock} title="{i18n.getMessage('unlock')}" tabindex="2"
                       disabled={extensionUnlockPassword === '' || inUnlockRequest}>
            {i18n.getMessage("unlock")}
        </OnClickButton>
    </div>
</form>
