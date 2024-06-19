<script lang="ts">
    import { onMount } from "svelte";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import Loading from "~spa_components/Loading.svelte";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import NotyService from "~services/frontend/NotyService";
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type { CredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/CredentialInterface";
    import { CREDENTIAL_EDIT_SECTIONS } from "~lib/Utils";
    import EditGeneral from "~spa_partials/CredentialEditSections/EditGeneral.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { refresh, save } from "svelte-awesome/package/icons";
    import { push } from "~Router.svelte";

    export let params: { guid?: string } = {};
    let pageIsLoading = true;
    let lockSaveButton = false;
    let vault: Vault = null;
    let credential: Credential = null;
    let credentialData: CredentialInterface = null;
    let selectedSection: CREDENTIAL_EDIT_SECTIONS = CREDENTIAL_EDIT_SECTIONS.GENERAL;

    console.debug("Credential edit");

    const openSection = (section: CREDENTIAL_EDIT_SECTIONS) => {
        selectedSection = section;
    }

    const saveCredential = async () => {
        if (credentialData.label === null || credentialData.label.length === 0) {
            NotyService.notyError(chrome.i18n.getMessage('label_required'));
            return;
        }
        if (credentialData.password === undefined) {
            NotyService.notyError(chrome.i18n.getMessage('no_password_match'));
            return;
        }
        if (credential.password !== credentialData.password) {
            credentialData.compromised = false;
        }
        lockSaveButton = true;

        credential.updateData(credentialData);
        if (await credential.update()) {
            NotyService.notySuccess(chrome.i18n.getMessage('credential_updated'));
            push('/home');
        } else {
            NotyService.notyError(chrome.i18n.getMessage('credential_update_error'));
        }
        lockSaveButton = false;
    }

    onMount(() => {
        console.debug(params);
        ExtensionSettingsService.getPassmanClient(true).then(async (passmanClient) => {
            if (passmanClient) {
                ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    try {
                        let myVault = await passmanClient.getVaultByGuid(defaultVaultInfo.guid, true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                await myVault.refresh(true);
                            }
                            vault = myVault;

                            credential = vault.getCredentialByGuid(params.guid);
                            if (credential === undefined) {
                                // it seems the local vault does not contain a credential with the requested guid, try to refresh vault
                                await vault.refresh();
                                credential = vault.getCredentialByGuid(params.guid);
                            }
                            if (credential) {
                                await credential.refresh();
                                credentialData = credential.exportData();
                            } else {
                                NotyService.notyError('Could not find selected credential');
                            }
                        } else {
                            NotyService.notyError('Could not decrypt vault');
                        }
                    } catch (exception) {
                        console.error(exception);
                        NotyService.notyError('Could not get or decrypt vault');
                    }
                    pageIsLoading = false;
                });
            } else {
                console.error("no passman client for you");
                pageIsLoading = false;
            }
        });
    });
</script>

<div class="h-full overflow-y-auto flex flex-col">
    <div>
        {#if pageIsLoading}
            <Loading/>
        {:else}
            <div class="w-full flex flex-nowrap items-center justify-center space-x-4 border-b p-2 bg-white">
                <OnClickButton callback={saveCredential} title="{chrome.i18n.getMessage('save')}"
                               bind:disabled="{lockSaveButton}">
                    {#if lockSaveButton}
                        <Icon data={refresh} scale={1.3} spin="{true}"/>
                    {:else}
                        <Icon data={save} scale={1.3}/>
                    {/if}
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.GENERAL)} title="General"
                               additionalClasses=""
                               disabled={!credential}>
                    <span>General</span>
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.CUSTOM_FIELDS)}
                               title="Custom fields" additionalClasses=""
                               disabled={!credential}>
                    <span>Custom fields</span>
                </OnClickButton>
            </div>
            <div class="flex flex-col p-5">
                {#if credentialData}
                    {#if selectedSection === CREDENTIAL_EDIT_SECTIONS.GENERAL}
                        <EditGeneral bind:credentialData/>
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</div>
