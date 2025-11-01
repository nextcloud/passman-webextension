<script lang="ts">
    import { onMount } from "svelte";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { externalLink, lock, plus, close } from "svelte-awesome/icons";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import CredentialListElement from "~/spa_partials/InteractionElements/CredentialListElement.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";
    import { CustomCredentialFilterService } from "~/services/CustomCredentialFilterService";
    import type { GetCredentialsForVaultMessagingResponse } from "~/entrypoints/background/messages/getCredentialsForVault";
    import NotyService from "~/services/frontend/NotyService";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { i18n } from "~/lib/i18n";
    import browser from "webextension-polyfill";
    import CustomStorageService, { CONTENT_SCRIPT_MODIFIED_CREDENTIALS_KEY } from "~/services/CustomStorageService";
    import { sendMessage } from "@/entrypoints/background/messaging";

    let searchInput: string | null = null;
    let overwriteInputFilterByTabUrlPromise: Promise<string | null | undefined>;
    let errorMessage: string | null = null;
    let vault: Vault | null = null;
    let credentials: Credential[] | null = null;
    let filteredCredentials: Credential[] = [];
    let pageIsLoading = true;
    let initialLoadIsDone = false;

    const lockExtension = () => {
        sendMessage('lockExtension').then(() => {
            extensionUnlockStateStore.set(ExtensionUnlockState.LOCKED);
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
        sendMessage('getCredentialsForVault', {
            getCachedIfPossible: getCachedIfPossible
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
        browser.runtime.openOptionsPage();
    }

    const applyCredentialFilter = async (searchInput: string | null) => {
        filteredCredentials = [];

        if (vault && credentials && credentials.length > 0) {
            const overwriteInputFilterByTabUrl = await overwriteInputFilterByTabUrlPromise;
            if (overwriteInputFilterByTabUrl && searchInput === null) {
                await CustomCredentialFilterService.getCredentialsByUrl(overwriteInputFilterByTabUrl, credentials)
                    .then((credentials) => {
                        filteredCredentials = credentials;
                    });
            } else {
                // reset tab url search filter when entering a custom search value the first time
                // to prevent it from being reset during the inital request by the reactive statement block below, we need to wait until the initial request is done
                if (initialLoadIsDone || !overwriteInputFilterByTabUrl) {
                    overwriteInputFilterByTabUrlPromise = Promise.resolve(null);
                    filteredCredentials = CredentialFilterService.getFilteredCredentials(credentials, FILTERS.SHOW_ALL, searchInput ?? '');
                }
            }
        }
    };

    $: vault && credentials && applyCredentialFilter(searchInput ?? '');

    onMount(() => {
        ExtensionSettingsService.getPopupPassmanClient().then(async (popupPassmanClient) => {
            if (popupPassmanClient) {
                overwriteInputFilterByTabUrlPromise = browser.tabs.query({
                    currentWindow: true,
                    active: true
                }).then(function (activeTabs: browser.Tabs.Tab[]) {
                    return activeTabs[0].url;
                });

                ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    try {
                        if (defaultVaultInfo) {
                            const getUnsafeLocalStorage = await CustomStorageService.getUnsafeLocalStorage();
                            let getCachedIfPossible = true;

                            if ((await getUnsafeLocalStorage.get(CONTENT_SCRIPT_MODIFIED_CREDENTIALS_KEY)) === "true") {
                                getCachedIfPossible = false;
                                getUnsafeLocalStorage.remove(CONTENT_SCRIPT_MODIFIED_CREDENTIALS_KEY);
                            }

                            let myVault = await popupPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, getCachedIfPossible);
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
                    initialLoadIsDone = true;
                });
            } else {
                console.error("no passman client for you");
                pageIsLoading = false;
                initialLoadIsDone = true;
            }
        });
    })
</script>

<div class="h-full overflow-y-hidden flex flex-col">
    <div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b border-gray-200 dark:border-gray-500 p-2 bg-white">
        <OnClickButton callback={refreshCredentialList} title={i18n.getMessage('refresh_credential_list')} additionalClasses="w-12"
                       disabled={!vault}>
            <Icon data={refresh} scale={1.3}/>
        </OnClickButton>
        <InternalHrefLinkButton href="/credential/add" title={i18n.getMessage('create_new_credential')} additionalClasses="w12"
                        disabled={!vault}>
            <Icon data={plus} scale={1.3}/>
        </InternalHrefLinkButton>
        <div class="">
            <input bind:value={searchInput} placeholder={i18n.getMessage('type_to_search')}
                   class="block border-1 border-b-2 border-gray-200 p-2 focus:outline-none focus:border-primary-focus
        bg-blue-50 shadow-sm w-full dark:bg-neutral"
            />
        </div>
        <OnClickButton callback={lockExtension} title={i18n.getMessage('lock_extension')} additionalClasses="w-12">
            <Icon data={lock} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title={i18n.getMessage('open_options_page')} additionalClasses="w-12">
            <Icon data={externalLink} scale={1.2}/>
        </OnClickButton>
    </div>

    <div class="overflow-y-auto pt-2">
        {#if pageIsLoading}
            <Loading/>
        {:else}
            <div class="flex flex-col items-center justify-center">
                {#await overwriteInputFilterByTabUrlPromise then resolvedOverwriteInputFilterByTabUrl}
                    {#if resolvedOverwriteInputFilterByTabUrl}
                        <div class="text-gray-400 mb-1">
                            <button class="text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full px-2" on:click={() => {
                                overwriteInputFilterByTabUrlPromise = Promise.resolve(null);
                                applyCredentialFilter(searchInput ?? '');
                            }}>
                                {i18n.getMessage('clear_tab_url_filter')}
                                <Icon data={close} scale={0.8}/>
                            </button>
                        </div>
                    {/if}
                {/await}
                {#if errorMessage}
                    <div class="mt-2 text-red-600">
                        {errorMessage}
                    </div>
                {/if}

                {#each filteredCredentials as credential}
                    <CredentialListElement bind:credential onCredChangedCallback={() => refreshCredentialList(true)}/>
                {/each}
                {#if !errorMessage && filteredCredentials.length === 0}
                    <span class="text-gray-400 mt-4">
                        {i18n.getMessage('no_matching_credentials')}
                    </span>
                {/if}
            </div>
        {/if}
    </div>
</div>
