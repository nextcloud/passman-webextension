<script lang="ts">
    import { field, form } from 'svelte-forms';
    import { min, required } from 'svelte-forms/validators';
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import Card from "~spa_partials/Card.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    //import ncAuthStore, { PERSISTENT_AUTH_STORE_ACCESS_KEY } from "../stores/ncAuth";
    //import passmanStore from "../stores/passman";
    //import { notyError } from "../NotyService";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import UnlockExtensionService from "~services/UnlockExtensionService";
    import { push } from "~Router.svelte";
    import ExtensionSettingsService from "~services/ExtensionSettingsService";
    //import { MyLoggingService } from "../MyLoggingService";

    //const server = field('server', $ncAuthStore?.baseUrl, [required(), min(8)], { checkOnInit: true });
    const server = field('server', '', [required(), min(8)], { checkOnInit: true });
    //const user = field('user', $ncAuthStore?.user, [required(), min(3)], { checkOnInit: true });
    const user = field('user', '', [required(), min(3)], { checkOnInit: true });
    const token = field('token', '', [required()], { checkOnInit: true });
    //const persistence = field('persistence', $ncAuthStore?.persistence, [required()], { checkOnInit: true });
    const myForm = form(server, user, token);

    let errorMessage = "";
    let successMessage = "";
    let lockLoginButton = false;

    let login = async (): Promise<void> => {
        lockLoginButton = true;
        errorMessage = '';
        successMessage = '';

        if (!$server.value.startsWith('https://') && !$server.value.startsWith('http://')) {
            // throw new ConfigurationError('Base URL (or protocol) is invalid');
            // inject with https:// instead of throwing an error
            $server.value = 'https://'.concat($server.value);
        }

        const loginData = {
            baseUrl: $server.value,
            user: $user.value,
            token: $token.value,
            persistence: null
        };

        sendToBackground({
            name: "addNewServerConnection",
            body: loginData
        }).then((value) => {
            console.log(value.status);
            console.log(value.message);

            if (value.status) {
                successMessage = value.message;
                UnlockExtensionService.setSetupDone().then(() => {
                    push('/home');
                });
            } else {
                errorMessage = value.message;
            }

            lockLoginButton = false;
        });
    };

    onMount(() => {
        UnlockExtensionService.isUnlocked().then((isUnlocked) => {
            lockLoginButton = !isUnlocked;

            UnlockExtensionService.isSetupDone().then((isSetupDone) => {
                if (isSetupDone) {
                    // populate input fields with current settings
                    ExtensionSettingsService.getNextcloudServerSettings().then((settings) => {
                        server.set(settings.baseUrl);
                        user.set(settings.user);
                        token.set(settings.token);
                    });
                }
            });
        });
    });
</script>

<div class="mx-auto flex flex-col p-5 w-full items-center justify-center">
    <Card additionalClasses="text-left mb-6 space-y-3 w-full">
        <p>
            This extension requires the
            <a href="https://apps.nextcloud.com/apps/passman" class="link" target="_blank">Passman App</a>
            to be installed on your Nextcloud server.
        </p>
        <p>
            No data is transferred to sources other than the specified Nextcloud server.
        </p>
    </Card>
    <Card additionalClasses="text-left w-full">
        <CustomInputField label="{chrome.i18n.getMessage('server_url')}" bind:value={$server.value}/>
        <div class="mt-2">
            <CustomInputField label="{chrome.i18n.getMessage('username')}" bind:value={$user.value}/>
        </div>
        <div class="mt-2">
            <CustomInputField label="{chrome.i18n.getMessage('password')}" bind:value={$token.value}
                              type="password"/>
        </div>
        <div class="mt-4">
            <OnClickButton disabled={!$myForm.valid || lockLoginButton} callback="{login}">
                {#if lockLoginButton}
                    <Icon data={refresh} scale={1.3} spin="{true}"/>
                {:else}
                    {chrome.i18n.getMessage('save')}
                {/if}
            </OnClickButton>
        </div>

        <div class="mt-2 text-green-600">
            {successMessage}
        </div>
        <div class="mt-2 text-red-600">
            {errorMessage}
        </div>
    </Card>
</div>
