<script lang="ts">
    //import { PassmanClient } from "@binsky/passman-client-ts";
    import { field, form } from 'svelte-forms';
    import { min, required } from 'svelte-forms/validators';
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import Card from "~spa_partials/Card.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    //import ncAuthStore, { PERSISTENT_AUTH_STORE_ACCESS_KEY } from "../stores/ncAuth";
    import { onMount } from "svelte";
    //import { BrowserStorage, BrowserStorageType } from "../stores/browser";
    //import passmanStore from "../stores/passman";
    //import { notyError } from "../NotyService";
    import refresh from "svelte-awesome/icons/refresh";
    import Icon from "svelte-awesome/components/Icon.svelte";
    //import { BrowserStorageType } from "@binsky/passman-client-ts/lib/BrowserStorage";
    //import { MyLoggingService } from "../MyLoggingService";

    //const server = field('server', $ncAuthStore?.baseUrl, [required(), min(8)], { checkOnInit: true });
    const server = field('server', '', [required(), min(8)], { checkOnInit: true });
    //const user = field('user', $ncAuthStore?.user, [required(), min(3)], { checkOnInit: true });
    const user = field('user', '', [required(), min(3)], { checkOnInit: true });
    const token = field('token', '', [required()], { checkOnInit: true });
    //const persistence = field('persistence', $ncAuthStore?.persistence, [required()], { checkOnInit: true });
    const myForm = form(server, user, token);

    let status = "";
    let lockLoginButton = false;

    let login = async (): Promise<void> => {
        lockLoginButton = true;
        if (!$server.value.startsWith('https://') && !$server.value.startsWith('http://')) {
            // throw new ConfigurationError('Base URL (or protocol) is invalid');
            // inject with https:// instead of throwing an error
            $server.value = 'https://'.concat($server.value);
        }

        const loginData = {
            baseUrl: $server.value,
            user: $user.value,
            token: $token.value,
            persistence: "localStorage" //BrowserStorageType.PERSISTENT
        };

        /*try {
            const passmanClient = new PassmanClient(loginData, new MyLoggingService());
            if (await passmanClient.refreshVaults(true)) {
                passmanStore.set(passmanClient);
                ncAuthStore.set(loginData);
                status = "Login succeeded";

                BrowserStorage.setDefaultStorageType(loginData.persistence as BrowserStorageType);
                const bs = BrowserStorage.getInstance();
                bs.updateStorageType(loginData.persistence as BrowserStorageType);
                bs.set(PERSISTENT_AUTH_STORE_ACCESS_KEY, loginData);
            } else {
                status = "Login failed";
            }
        } catch (e) {
            notyError(e.message);
        }*/
        lockLoginButton = false;
    }

    onMount(async () => {
        status = "";
    });
</script>

<div class="mx-auto flex flex-col mt-20 w-full items-center justify-center">
    <Card additionalClasses="text-left w-[32rem] mb-8 space-y-3">
        <p>
            This extension requires the
            <a href="https://apps.nextcloud.com/apps/passman" class="link" target="_blank">Passman App</a>
            to be installed on your Nextcloud server.
        </p>
        <p>
            No data is transferred to sources other than the specified Nextcloud server.
        </p>
    </Card>
    <Card additionalClasses="text-left w-[32rem] mb-2">
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

        {status}
    </Card>
</div>
