<script lang="ts">
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import { push } from "~Router.svelte";
    import { externalLink, lock, plus } from "svelte-awesome/package/icons";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import CredentialListElement from "~spa_partials/InteractionElements/CredentialListElement.svelte";
    import Loading from "~spa_components/Loading.svelte";
    import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";
    import { CustomCredentialFilterService } from "~services/CustomCredentialFilterService";
    import type { GetCredentialsForVaultMessagingResponse } from "~background/messages/getCredentialsForVault";
    import NotyService from "~services/frontend/NotyService";

    let searchInput: string | null = null;
    let overwriteInputFilterByTabUrl: string | null | undefined = null;
    let errorMessage: string | null = null;
    let vault: Vault | null = null;
    let credentials: Credential[] | null = null;
    let filteredCredentials: Credential[] = [];
    let pageIsLoading = true;

    const lockExtension = () => {
        sendToBackground({
            name: "lockExtension"
        }).then(() => {
            $extensionUnlockStateStore = ExtensionUnlockState.LOCKED;
            if (credentials) {
                vault = null;
                credentials = null;
                filteredCredentials = [];
            }
            push('/unlock');
        });
    }

    const refreshCredentialList = (getCachedIfPossible: boolean = false) => {
        pageIsLoading = true;
        sendToBackground({
            name: "getCredentialsForVault",
            body: {
                getCachedIfPossible: getCachedIfPossible
            }
        }).then((response: GetCredentialsForVaultMessagingResponse) => {
            if (response.status && vault) {
                credentials = [];
                for (const serializedCredential of response.serializedCredentials) {
                    const credential = Credential.fromSerializable(serializedCredential, vault, vault.getServer());
                    credentials.push(credential);
                }
                filteredCredentials = [];
            } else {
                NotyService.notyError(response.errorMessage ?? 'Unknown error in refreshCredentialList');
            }
            pageIsLoading = false;
        });
    }

    const openOptionsPage = () => {
        chrome.runtime.openOptionsPage();
    }

    const applyCredentialFilter = async (searchInput: string) => {
        filteredCredentials = [];

        if (vault && credentials && credentials.length > 0) {
            if (overwriteInputFilterByTabUrl && searchInput === null) {
                await CustomCredentialFilterService.getCredentialsByUrl(overwriteInputFilterByTabUrl, credentials)
                    .then((credentials) => {
                        filteredCredentials = credentials;
                    });
            } else {
                // reset tab url search filter when entering a custom search value the first time
                overwriteInputFilterByTabUrl = null;
                filteredCredentials = CredentialFilterService.getFilteredCredentials(credentials, FILTERS.SHOW_ALL, searchInput ?? '');
            }
        }
    };

    $: vault && credentials && applyCredentialFilter(searchInput ?? '');

    onMount(() => {
        ExtensionSettingsService.getPopupPassmanClient().then(async (popupPassmanClient) => {
            if (popupPassmanClient) {
                await chrome.tabs.query({
                    currentWindow: true,
                    active: true
                }).then(function (activeTabs: chrome.tabs.Tab[]) {
                    overwriteInputFilterByTabUrl = activeTabs[0].url;
                });

                ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    try {
                        if (defaultVaultInfo) {
                            let myVault = await popupPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
                            if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                                myVault.vaultKey = defaultVaultInfo.password;

                                // not really needed, but if cached getFullVaultByGuid returns a vault without custom credentials, force refresh
                                if (myVault.credentials.length <= 1) {
                                    await myVault.refresh(false);
                                }

                                vault = myVault;
                                credentials = vault.credentials;
                                filteredCredentials = [];
                                await applyCredentialFilter(null);
                            } else {
                                errorMessage = 'Could not decrypt vault';
                            }
                        } else {
                            errorMessage = 'No default vault info found';
                        }
                    } catch (exception) {
                        console.error(exception);
                        errorMessage = 'Could not get or decrypt vault';
                    }
                    pageIsLoading = false;
                });
            } else {
                console.error("no passman client for you");
                pageIsLoading = false;
            }
        });
    })
</script>

<div class="h-full overflow-y-hidden flex flex-col">
    <div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b p-2 bg-white">
        <OnClickButton callback={refreshCredentialList} title="Refresh credential list" additionalClasses="w-12"
                       disabled={!vault}>
            <Icon data={refresh} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title="Create new credential" additionalClasses="w-12"
                       disabled={!vault}>
            <Icon data={plus} scale={1.3}/>
        </OnClickButton>
        <div class="">
            <input bind:value={searchInput} placeholder="Type to search"
                   class="block border-1 border-b-2 border-gray-200 p-2 focus:outline-none focus:border-primary-focus
        bg-blue-50 shadow-sm w-full dark:bg-neutral"
            />
        </div>
        <OnClickButton callback={lockExtension} title="Lock" additionalClasses="w-12">
            <Icon data={lock} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title="Open options page" additionalClasses="w-12">
            <Icon data={externalLink} scale={1.2}/>
        </OnClickButton>
    </div>

    <div class="overflow-y-auto pt-2">
        {#if pageIsLoading}
            <Loading/>
        {:else}
            <div class="flex flex-col items-center justify-center">
                {#if errorMessage}
                    <div class="mt-2 text-red-600">
                        {errorMessage}
                    </div>
                {/if}

                {#each filteredCredentials as credential}
                    <CredentialListElement bind:credential/>
                {/each}
                {#if !errorMessage && filteredCredentials.length === 0}
                    <span class="text-gray-400 mt-4">
                        No matching credentials
                    </span>
                {/if}
            </div>
        {/if}
    </div>
</div>
