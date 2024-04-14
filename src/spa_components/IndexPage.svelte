<script lang="ts">
    import { sendToBackground } from "@plasmohq/messaging";
    import { onMount } from "svelte";
    import { SecureStorage } from "@plasmohq/storage/dist/secure";
    import { push } from "~Router.svelte";
    import { externalLink, lock, plus } from "svelte-awesome/package/icons";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import refresh from "svelte-awesome/icons/refresh";
    import extensionUnlockStateStore, { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import ExtensionSettingsService from "~services/ExtensionSettingsService";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import CredentialListElement from "~spa_partials/InteractionElements/CredentialListElement.svelte";
    import Loading from "~spa_components/Loading.svelte";

    let storage: SecureStorage = null;
    let searchInput = '';
    let errorMessage: string = null;
    let vault: Vault = null;
    let filteredCredentials: Credential[] = [];
    let pageIsLoading = true;

    const lockExtension = () => {
        sendToBackground({
            name: "lockExtension"
        }).then(() => {
            $extensionUnlockStateStore = ExtensionUnlockState.LOCKED;
            push('/unlock');
        });
    }

    const refreshCredentialList = () => {
        if (vault) {
            pageIsLoading = true;
            vault.refresh().then(() => {
                vault = vault;
                console.log("refreshCredentialList done");
                pageIsLoading = false;
            });
        }
    }

    const openOptionsPage = () => {
        chrome.runtime.openOptionsPage();
    }

    const applyCredentialFilter = (searchInput: string) => {
        console.log("applyCredentialFilter", searchInput, vault);
        if (vault) {
            if (!searchInput) {
                filteredCredentials = vault.credentials;
            } else {
                // todo: implement logic to filter input
                console.log("todo: implement logic to filter input", searchInput);
            }
        }
    };

    $: vault && applyCredentialFilter(searchInput);

    onMount(() => {
        ExtensionSettingsService.getPassmanClient(true).then((passmanClient) => {
            if (passmanClient) {
                console.log("got passman client");
                ExtensionSettingsService.getDefaultVaultInfo().then(async (defaultVaultInfo) => {
                    try {
                        let myVault = await passmanClient.getVaultByGuid(defaultVaultInfo.guid);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                console.log("refresh vault");
                                await myVault.refresh();
                            }
                            vault = myVault;
                        } else {
                            errorMessage = 'Could not decrypt vault';
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
        <OnClickButton callback={refreshCredentialList} title="Refresh credential list" additionalClasses="w-12">
            <Icon data={refresh} scale={1.3}/>
        </OnClickButton>
        <OnClickButton callback={openOptionsPage} title="Create new credential" additionalClasses="w-12">
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
            <Loading />
        {:else}
            <div class="flex flex-col items-center justify-center space-y-4">
                {#if errorMessage}
                    <div class="mt-2 text-red-600">
                        {errorMessage}
                    </div>
                {/if}

                {#each filteredCredentials as credential}
                    <CredentialListElement bind:credential/>
                {/each}
            </div>
        {/if}
    </div>
</div>
