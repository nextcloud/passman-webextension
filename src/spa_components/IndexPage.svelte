<script lang="ts">
    import { onMount, untrack } from "svelte";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { externalLink, lock, plus, close } from "svelte-awesome/icons";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import PassmanClientService from "~/services/PassmanClientService";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import CredentialListElement from "~/spa_partials/InteractionElements/CredentialListElement.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import {
        GetCredentialsListMessagingFilterType,
        type DecryptedPartialCredentialData,
        type GetCredentialsListMessagingResponse
    } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import NotyService from "~/services/frontend/NotyService";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { i18n } from "~/lib/i18n";
    import browser from "webextension-polyfill";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import Utils from "~/lib/Utils";
    import { logger } from "~/services/ConsoleLoggingService";

    let searchInput = $state<string | null>(null);
    let searchInputRef = $state<HTMLInputElement | undefined>(undefined);
    /** Active tab-URL filter; null when inactive / cleared. */
    let urlFilter = $state<string | null>(null);
    let errorMessage = $state<string | null>(null);
    let vault = $state<Vault | null>(null);
    let listItems = $state<DecryptedPartialCredentialData[]>([]);
    let pageIsLoading = $state(true);
    let manualRefreshInProgress = $state(false);
    let initialLoadIsDone = $state(false);
    let listFetchGeneration = 0;
    const isInPopup = Utils.isInPopup();

    const resolveListFilter = (): {
        filterType: GetCredentialsListMessagingFilterType,
        filterText: string
    } => {
        // URL mode only while the tab URL filter is active and the user has not typed in search yet
        if (urlFilter && searchInput === null) {
            return {
                filterType: GetCredentialsListMessagingFilterType.SEARCH_BY_URL,
                filterText: urlFilter
            };
        }
        return {
            filterType: GetCredentialsListMessagingFilterType.DEFAULT_SEARCH_FULL_TEXT_LABEL,
            filterText: searchInput ?? ''
        };
    };

    const fetchCredentialList = async (
        getCachedIfPossible: boolean,
        options: { showLoading?: boolean, manualRefresh?: boolean } = {}
    ) => {
        const showLoading = options.showLoading ?? false;
        if (showLoading) {
            pageIsLoading = true;
        }
        if (options.manualRefresh) {
            manualRefreshInProgress = true;
        }

        const generation = ++listFetchGeneration;
        const { filterType, filterText } = resolveListFilter();

        try {
            const response: GetCredentialsListMessagingResponse = await sendMessage(
                'getPartiallyDecryptedFilteredCredentialsList',
                {
                    filterText,
                    filterType,
                    getCachedIfPossible
                }
            );

            // if the generation has changed, the list has been refreshed since the request was made, so we can ignore the response
            if (generation !== listFetchGeneration) {
                return;
            }

            if (response.status) {
                listItems = response.decryptedPartialCredentialData;
                errorMessage = null;
            } else {
                NotyService.notyError(
                    response.errorMessage ?? i18n.getMessage('unknown_error_refresh_credential_list')
                );
            }
        } catch (exception) {
            if (generation !== listFetchGeneration) {
                return;
            }
            logger.error(exception);
            NotyService.notyError(i18n.getMessage('unknown_error_refresh_credential_list'));
        } finally {
            // only the latest request may clear loading status
            if (generation === listFetchGeneration) {
                pageIsLoading = false;
                manualRefreshInProgress = false;
            }
        }
    };

    const debouncedFetchFromSearch = Utils.debounce(() => {
        void fetchCredentialList(true);
    }, 200);

    const lockExtension = () => {
        sendMessage('lockExtension').then(() => {
            extensionUnlockStateStore.set(ExtensionUnlockState.LOCKED);
            vault = null;
            listItems = [];
            urlFilter = null;
            push('/unlock');
        });
    };

    const refreshCredentialList = (getCachedIfPossible: boolean = false) => {
        void fetchCredentialList(getCachedIfPossible, { showLoading: true, manualRefresh: true });
    };

    const clearUrlFilter = () => {
        urlFilter = null;
        void fetchCredentialList(true);
    };

    const openOptionsPage = () => {
        browser.runtime.openOptionsPage();
    };

    // After initial load, typing in search clears the URL filter and re-fetches (debounced)
    $effect(() => {
        const input = searchInput;
        if (!vault || !initialLoadIsDone || input === null) {
            return;
        }

        untrack(() => {
            urlFilter = null;
        });
        debouncedFetchFromSearch();
    });

    onMount(() => {
        searchInputRef?.focus();

        PassmanClientService.getPopupPassmanClient().then(async (popupPassmanClient) => {
            if (popupPassmanClient) {
                // Only filter by the active tab URL in the popup; options page should show all credentials
                if (isInPopup) {
                    try {
                        const activeTabs = await browser.tabs.query({
                            currentWindow: true,
                            active: true
                        });
                        if (Array.isArray(activeTabs) && activeTabs.length !== 0 && activeTabs[0].url) {
                            try {
                                new URL(activeTabs[0].url);
                                urlFilter = activeTabs[0].url;
                            } catch (e) {
                                urlFilter = null;
                            }
                        } else {
                            urlFilter = null;
                        }
                    } catch (e) {
                        urlFilter = null;
                    }
                } else {
                    urlFilter = null;
                }

                ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    try {
                        if (defaultVaultInfo) {
                            // Always prefer memory / shared IndexedDB model store with the option to recreate the vault from cached DTOs, when opening the popup
                            let myVault = await popupPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
                            if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                                myVault.vaultKey = defaultVaultInfo.password;

                                // not really needed, but if cached getFullVaultByGuid returns a vault without custom credentials, force refresh
                                if (myVault.credentials.length <= 1) {
                                    await myVault.refresh(false);
                                }

                                vault = myVault;
                                await fetchCredentialList(true, { showLoading: true, manualRefresh: false });
                            } else if (myVault) {
                                errorMessage = i18n.getMessage('could_not_decrypt_vault');
                                pageIsLoading = false;
                            } else {
                                errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                                pageIsLoading = false;
                            }
                        } else {
                            errorMessage = i18n.getMessage('no_default_vault_info_found');
                            pageIsLoading = false;
                        }
                    } catch (exception) {
                        logger.error(exception);
                        errorMessage = i18n.getMessage('could_not_get_or_decrypt_vault');
                        pageIsLoading = false;
                    }
                    initialLoadIsDone = true;
                });
            } else {
                logger.error("no passman client for you");
                pageIsLoading = false;
                initialLoadIsDone = true;
            }
        });
    });
</script>

<div class="h-full overflow-y-hidden flex flex-col">
    <div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b border-gray-200 dark:border-gray-500 p-2 bg-white">
        <OnClickButton callback={refreshCredentialList} title={i18n.getMessage('refresh_credential_list')} additionalClasses="w-12"
                       disabled={!vault || manualRefreshInProgress}>
            <Icon data={refresh} scale={1.3} spin={manualRefreshInProgress}/>
        </OnClickButton>
        <InternalHrefLinkButton href="/credential/add" title={i18n.getMessage('create_new_credential')} additionalClasses="w12"
                        disabled={!vault}>
            <Icon data={plus} scale={1.3}/>
        </InternalHrefLinkButton>
        <div class="">
            <input bind:this={searchInputRef} bind:value={searchInput} placeholder={i18n.getMessage('type_to_search')}
                   class="block border-1 border-b-2 border-gray-200 p-2 focus:outline-none focus:border-b-primary-focus
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
                {#if urlFilter}
                    <div class="text-gray-400 mb-1">
                        <button class="text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full px-2 cursor-pointer" onclick={clearUrlFilter}>
                            {i18n.getMessage('clear_tab_url_filter')}
                            <Icon data={close} scale={0.8}/>
                        </button>
                    </div>
                {/if}
                {#if errorMessage}
                    <div class="mt-2 text-red-600">
                        {errorMessage}
                    </div>
                {/if}

                {#if vault}
                    {#each listItems as item (item.guid)}
                        <CredentialListElement
                            decryptedPartialCredentialData={item}
                            vault={vault}
                            onCredChangedCallback={() => refreshCredentialList(true)}
                        />
                    {/each}
                {/if}
                {#if !errorMessage && listItems.length === 0}
                    <span class="text-gray-400 mt-4">
                        {i18n.getMessage('no_matching_credentials')}
                    </span>
                {/if}
            </div>
        {/if}
    </div>
</div>
