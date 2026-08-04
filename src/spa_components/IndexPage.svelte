<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { get } from "svelte/store";
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import { externalLink, lock, plus, close } from "svelte-awesome/icons";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~/stores/extensionUnlockStateStore";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import PassmanClientService from "~/services/PassmanClientService";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import CredentialListElement from "~/spa_partials/InteractionElements/CredentialListElement.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import LineLoading from "~/spa_components/LineLoading.svelte";
    import {
        GetCredentialsListMessagingFilterType,
        type DecryptedPartialCredentialData,
        type GetCredentialsListMessagingResponse
    } from "~/entrypoints/background/messages/getPartiallyDecryptedFilteredCredentialsList";
    import type { GetCredentialsForVaultMessagingResponse } from "~/entrypoints/background/messages/getCredentialsForVault";
    import NotyService from "~/services/frontend/NotyService";
    import InternalHrefLinkButton from "~/spa_partials/InteractionElements/InternalHrefLinkButton.svelte";
    import { i18n } from "~/lib/i18n";
    import browser from "webextension-polyfill";
    import { sendMessage } from "@/entrypoints/background/messaging";
    import Utils from "~/lib/Utils";
    import { logger } from "~/services/ConsoleLoggingService";

    /** Collapsed row height including py-1 wrapper padding + card chrome (border/padding + two truncated text lines). */
    const COLLAPSED_ROW_PX = 60;

    let searchInput = $state<string | null>(null);
    let searchInputRef = $state<HTMLInputElement | undefined>(undefined);
    /** Active tab-URL filter; null when inactive / cleared. */
    let urlFilter = $state<string | null>(null);
    let errorMessage = $state<string | null>(null);
    let vault = $state<Vault | null>(null);
    let listItems = $state<DecryptedPartialCredentialData[]>([]);
    let pageIsLoading = $state(true);
    let manualRefreshInProgress = $state(false);
    /** True from search keystroke through debounce + latest search response. */
    let searchBusy = $state(false);
    let initialLoadIsDone = $state(false);
    let listFetchGeneration = 0;
    /** Avoid re-pinning the same corrupt-credential warning on every search/refresh. */
    let lastCorruptCredentialsNoticeKey = '';
    const isInPopup = Utils.isInPopup();

    let listScrollEl = $state<HTMLDivElement | undefined>(undefined);
    let expandedGuids = $state<Set<string>>(new Set());
    let hydratedByGuid = $state<Map<string, Credential>>(new Map());
    /** Measured expanded heights by guid; plain Map so scroll remasures do not invalidate Svelte. */
    const sizeByGuid = new Map<string, number>();
    const hydratePromisesByGuid = new Map<string, Promise<Credential | null>>();

    /** Some known browser built-in URLs that should not be filtered by the URL filter. */
    const noFilterUrls = new Set<string>([
        'about:debugging',
        'about:blank',
        'about:newtab',
        'about:home',
        'about:addons',
        'about:config',
        'about:preferences',
        'chrome://newtab/',
        'chrome://extensions',
    ]);

    const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: 0,
        getScrollElement: () => null,
        estimateSize: () => COLLAPSED_ROW_PX,
        overscan: 8,
    });

    /** Keep count/estimates in sync with listItems before paint; $effect alone is one tick late after search. */
    const applyVirtualizerOptions = (
        items: DecryptedPartialCredentialData[],
        scrollEl: HTMLDivElement | undefined = listScrollEl,
        applyResizeToKnownExpandedRows: boolean = false
    ) => {
        const v = get(virtualizer);
        v.setOptions({
            count: items.length,
            getScrollElement: () => scrollEl ?? null,
            // Key size cache by guid so filter/reorder does not reuse another credential's measured height at the same index.
            getItemKey: (index) => items[index]?.guid ?? index,
            estimateSize: (index) => {
                const guid = items[index]?.guid;
                if (guid && sizeByGuid.has(guid)) {
                    return sizeByGuid.get(guid)!;
                }
                return COLLAPSED_ROW_PX;
            },
            overscan: 8,
        });

        // Re-apply known expanded sizes at their new indexes after the list identity changes.
        // Run only on effect to avoid running twice on the same list items with our "previous-tick-manual-call".
        if (applyResizeToKnownExpandedRows) {
            for (let index = 0; index < items.length; index++) {
                const size = sizeByGuid.get(items[index].guid);
                if (size != null) {
                    v.resizeItem(index, size);
                }
            }
        }
    };

    $effect(() => {
        applyVirtualizerOptions(listItems, listScrollEl, true);
    });

    $effect(() => {
        const present = new Set(listItems.map((item) => item.guid));
        let removed = false;
        const next = new Set<string>();
        for (const guid of expandedGuids) {
            if (present.has(guid)) {
                next.add(guid);
            } else {
                removed = true;
                sizeByGuid.delete(guid);
            }
        }
        if (removed) {
            expandedGuids = next;
        }
    });

    /**
     * Measure only expanded rows. Collapsed rows stay on the fixed estimate so ResizeObserver
     * does not thrash scroll while recycling. Ignore no-op height updates to avoid subpixel loops.
     */
    const measureExpandedRow = (node: HTMLDivElement, active: boolean) => {
        let raf = 0;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                if (!node.isConnected) {
                    return;
                }
                const index = Number(node.dataset.index);
                if (Number.isNaN(index)) {
                    return;
                }
                const guid = listItems[index]?.guid;
                if (!guid || !expandedGuids.has(guid)) {
                    return;
                }
                const height = Math.round(node.offsetHeight);
                if (sizeByGuid.get(guid) === height) {
                    return;
                }
                sizeByGuid.set(guid, height);
                get(virtualizer).resizeItem(index, height);
            });
        });

        const sync = (shouldMeasure: boolean) => {
            if (shouldMeasure) {
                ro.observe(node);
                return;
            }
            ro.unobserve(node);
            const index = Number(node.dataset.index);
            const guid = listItems[index]?.guid;
            if (guid) {
                sizeByGuid.delete(guid);
            }
            if (!Number.isNaN(index)) {
                get(virtualizer).resizeItem(index, COLLAPSED_ROW_PX);
            }
        };

        sync(active);
        return {
            update: sync,
            destroy() {
                cancelAnimationFrame(raf);
                ro.disconnect();
            }
        };
    };

    const setHydratedCredential = (guid: string, credential: Credential | null) => {
        const next = new Map(hydratedByGuid);
        if (credential) {
            next.set(guid, credential);
        } else {
            next.delete(guid);
        }
        hydratedByGuid = next;
    };

    const collapseGuid = (guid: string) => {
        if (!expandedGuids.has(guid)) {
            return;
        }
        const next = new Set(expandedGuids);
        next.delete(guid);
        expandedGuids = next;
        sizeByGuid.delete(guid);
        const index = listItems.findIndex((item) => item.guid === guid);
        if (index >= 0) {
            get(virtualizer).resizeItem(index, COLLAPSED_ROW_PX);
        }
    };

    const ensureHydrated = (guid: string): Promise<Credential | null> => {
        const cached = hydratedByGuid.get(guid);
        if (cached) {
            return Promise.resolve(cached);
        }

        const inFlight = hydratePromisesByGuid.get(guid);
        if (inFlight) {
            return inFlight;
        }

        const currentVault = vault;
        if (!currentVault) {
            return Promise.resolve(null);
        }

        const promise = (async () => {
            try {
                const response: GetCredentialsForVaultMessagingResponse = await sendMessage(
                    'getCredentialsForVault',
                    {
                        getCachedIfPossible: true,
                        guid
                    }
                );
                if (response.status && response.serializedCredentials.length > 0) {
                    const credential = Credential.fromSerializable(
                        response.serializedCredentials[0],
                        currentVault,
                        currentVault.getServer()
                    );
                    setHydratedCredential(guid, credential);
                    return credential;
                }

                NotyService.notyError(
                    response.errorMessage ?? i18n.getMessage('could_not_find_selected_credential')
                );
                collapseGuid(guid);
                return null;
            } catch (e) {
                NotyService.notyError(i18n.getMessage('could_not_find_selected_credential'));
                collapseGuid(guid);
                return null;
            } finally {
                hydratePromisesByGuid.delete(guid);
            }
        })();

        hydratePromisesByGuid.set(guid, promise);
        return promise;
    };

    const toggleExpand = (guid: string) => {
        if (expandedGuids.has(guid)) {
            collapseGuid(guid);
            return;
        }
        const next = new Set(expandedGuids);
        next.add(guid);
        expandedGuids = next;
        void ensureHydrated(guid);
    };

    const resolveListFilter = (): {
        filterType: GetCredentialsListMessagingFilterType,
        filterText: string
    } => {
        // URL mode only while the tab URL filter is active and the user has not typed in search yet
        if (urlFilter && searchInput === null) {
            if (noFilterUrls.has(urlFilter)) {
                // reset urlFilter and proceed like without a URL filter
                urlFilter = null;
            } else {
                return {
                    filterType: GetCredentialsListMessagingFilterType.SEARCH_BY_URL,
                    filterText: urlFilter
                };
            }
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
                if (response.invalidUrlProvided) {
                    // Opening the popup on an invalid URL to be filtered is not an error, but we handle it by clearing the URL filter.
                    clearUrlFilter();
                } else {
                    listItems = response.decryptedPartialCredentialData;
                    errorMessage = null;
                    // Sync before the next render so getVirtualItems() cannot keep stale out-of-range indexes.
                    applyVirtualizerOptions(listItems);
                    get(virtualizer).scrollToOffset(0);

                    const skipped = response.skippedCorruptCredentials ?? [];
                    if (skipped.length > 0) {
                        const noticeKey = skipped.map((c) => c.guid).sort().join('|');
                        if (noticeKey !== lastCorruptCredentialsNoticeKey) {
                            lastCorruptCredentialsNoticeKey = noticeKey;
                            NotyService.notyPinnedWarning(
                                i18n.getMessage('corrupt_credentials_skipped', [
                                    String(skipped.length),
                                    truncate(skipped.map((c) => c.label).join(', '), 100),
                                ]),
                                i18n.getMessage('corrupt_credentials_skipped_title')
                            );
                        }
                    }
                }
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
                searchBusy = false;
            }
        }
    };

    const truncate = (str: string, n: number) => {
        return (str.length > n) ? str.slice(0, n-1) + '...' : str;
    };

    const debouncedFetchFromSearch = Utils.debounce(() => {
        // Re-assert in case a concurrent refresh cleared searchBusy while debounce was pending
        searchBusy = true;
        void fetchCredentialList(true);
    }, 200);

    const lockExtension = () => {
        sendMessage('lockExtension').then(() => {
            extensionUnlockStateStore.set(ExtensionUnlockState.LOCKED);
            vault = null;
            listItems = [];
            urlFilter = null;
            searchBusy = false;
            expandedGuids = new Set();
            hydratedByGuid = new Map();
            sizeByGuid.clear();
            hydratePromisesByGuid.clear();
            push('/unlock');
        });
    };

    const refreshCredentialList = (getCachedIfPossible: boolean = false) => {
        void fetchCredentialList(getCachedIfPossible, { showLoading: true, manualRefresh: true });
    };

    /** Stable callback so expanded rows are not invalidated on every virtualizer scroll tick. */
    const onCredChanged = () => {
        refreshCredentialList(true);
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
            searchBusy = true;
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
                            // Use lightweight preloadedVaults instead of popupPassmanClient.getFullVaultByGuid since the frontend no longer needs the full vault object for the list
                            let preloadedVault = popupPassmanClient.preloadedVaults.find((v) => v.guid === defaultVaultInfo.guid);
                            if (preloadedVault === undefined || true) {
                                console.error('force preloading vaults');
                                await popupPassmanClient.preloadVaults(false, false);
                                preloadedVault = popupPassmanClient.preloadedVaults.find((v) => v.guid === defaultVaultInfo.guid);
                            }

                            /*
                            let myVault = await popupPassmanClient.getFullVaultByGuid(defaultVaultInfo.guid, true);
                            if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                                myVault.vaultKey = defaultVaultInfo.password;

                                // not really needed, but if cached getFullVaultByGuid returns a vault without custom credentials, force refresh
                                if (myVault.credentials.length <= 1) {
                                    await myVault.refresh(false);
                                }

                                vault = myVault;
                                await fetchCredentialList(true, { showLoading: true, manualRefresh: false });*/
                            
                            if (preloadedVault && preloadedVault.testVaultKey(defaultVaultInfo.password)) {
                                await fetchCredentialList(true, { showLoading: true, manualRefresh: false });
                            } else if (preloadedVault) {
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

<div class="h-full overflow-hidden flex flex-col">
    <div class="shrink-0 w-full flex flex-nowrap items-center justify-center space-x-4 border-b border-gray-200 dark:border-gray-500 p-2 bg-white">
        <OnClickButton callback={refreshCredentialList} title={i18n.getMessage('refresh_credential_list')} additionalClasses="w-12"
                       disabled={!vault || manualRefreshInProgress}>
            <Icon data={refresh} scale={1.3} spin={manualRefreshInProgress}/>
        </OnClickButton>
        <InternalHrefLinkButton href="/credential/add" title={i18n.getMessage('create_new_credential')} additionalClasses="w12"
                        disabled={!vault}>
            <Icon data={plus} scale={1.3}/>
        </InternalHrefLinkButton>
        <div class="relative">
            <input bind:this={searchInputRef} bind:value={searchInput} placeholder={i18n.getMessage('type_to_search')}
                   class="block border-1 border-b-2 border-gray-200 p-2 focus:outline-none focus:border-b-primary-focus
        bg-blue-50 shadow-sm w-full dark:bg-neutral"
            />
            {#if searchBusy}
                <div class="absolute left-0 right-0 bottom-0 pointer-events-none">
                    <LineLoading additionalStyle="border-radius: 0; background-color: transparent;"/>
                </div>
            {/if}
        </div>
        <OnClickButton callback={lockExtension} title={i18n.getMessage('lock_extension')} additionalClasses="w-12">
            <Icon data={lock} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title={i18n.getMessage('open_options_page')} additionalClasses="w-12">
            <Icon data={externalLink} scale={1.2}/>
        </OnClickButton>
    </div>

    {#if pageIsLoading}
        <div class="flex-1 min-h-0">
            <Loading/>
        </div>
    {:else}
        <div class="shrink-0 flex flex-col items-center pt-2">
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
            {#if !errorMessage && listItems.length === 0}
                <span class="text-gray-400 mt-4">
                    {i18n.getMessage('no_matching_credentials')}
                </span>
            {/if}
        </div>

        {#if vault && listItems.length > 0}
            <div bind:this={listScrollEl} class="flex-1 min-h-0 overflow-y-auto">
                <div
                    class="relative w-full"
                    style="height: {$virtualizer.getTotalSize()}px;"
                >
                    {#each $virtualizer.getVirtualItems() as virtualItem (virtualItem.key)}
                        {@const item = listItems[virtualItem.index]}
                        {#if item}
                            {@const isExpanded = expandedGuids.has(item.guid)}
                            <div
                                data-index={virtualItem.index}
                                use:measureExpandedRow={isExpanded}
                                class="absolute top-0 left-0 w-full py-1 [contain:layout_style]"
                                style="transform: translateY({virtualItem.start}px);"
                            >
                                <div class="flex justify-center">
                                    <CredentialListElement
                                        decryptedPartialCredentialData={item}
                                        onCredChangedCallback={onCredChanged}
                                        expanded={isExpanded}
                                        hydratedCredential={hydratedByGuid.get(item.guid) ?? null}
                                        onToggleExpand={toggleExpand}
                                        ensureHydrated={ensureHydrated}
                                    />
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>
