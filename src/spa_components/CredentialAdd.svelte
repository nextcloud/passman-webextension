<script lang="ts">
    import { onMount } from "svelte";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import PassmanClientService from "~/services/PassmanClientService";
    import Loading from "~/spa_components/Loading.svelte";
    import type Vault from "@binsky/passman-client-ts/lib/Model/Vault";
    import NotyService from "~/services/frontend/NotyService";
    import Credential from "@binsky/passman-client-ts/lib/Model/Credential";
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import { CREDENTIAL_EDIT_SECTIONS } from "~/lib/Utils";
    import EditGeneral from "~/spa_partials/CredentialEditSections/EditGeneral.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { refresh, save } from "svelte-awesome/icons";
    // @ts-expect-error
    import { push } from "~/Router.svelte";
    import EditCustomFields from "~/spa_partials/CredentialEditSections/EditCustomFields.svelte";
    import EditOTP from "~/spa_partials/CredentialEditSections/EditOTP.svelte";
    import EditFiles from "~/spa_partials/CredentialEditSections/EditFiles.svelte";
    import { i18n } from "~/lib/i18n";

    let pageIsLoading = true;
    let lockSaveButton = false;
    let vault: Vault | null = null;
    let credential: Credential | null = null;
    let credentialData: DecryptedCredentialInterface | null = null;
    let selectedSection: CREDENTIAL_EDIT_SECTIONS = CREDENTIAL_EDIT_SECTIONS.GENERAL;

    console.debug("Credential add");

    const openSection = (section: CREDENTIAL_EDIT_SECTIONS) => {
        selectedSection = section;
    }

    const saveCredential = async () => {
        if (!credentialData || !credential) {
            console.error("No credential / credential data found");
            NotyService.notyError(i18n.getMessage('credential_update_error'));
            return;
        }
        if (credentialData.label === null || credentialData.label.length === 0) {
            NotyService.notyError(i18n.getMessage('label_required'));
            return;
        }
        if (credentialData.password === undefined) {
            NotyService.notyError(i18n.getMessage('no_password_match'));
            return;
        }
        if (credential.password !== credentialData.password) {
            credentialData.compromised = false;
        }
        lockSaveButton = true;

        credential.updateData(credentialData);
        if (await credential.save()) {
            vault?.credentials.push(credential);
            NotyService.notySuccess(i18n.getMessage('credential_created'));
            push('/home');
        } else {
            NotyService.notyError(i18n.getMessage('credential_create_error'));
        }
        lockSaveButton = false;
    }

    onMount(() => {
        PassmanClientService.getPopupPassmanClient().then(async (popupPassmanClient) => {
            if (popupPassmanClient) {
                ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.defaultVaultInfo).then(async (defaultVaultInfo) => {
                    if (!defaultVaultInfo?.guid) {
                        console.error("No default vault info found");
                        // I don't think we need a special translated error message here, because this is an internal error, that should really never happen
                        NotyService.notyError(i18n.getMessage('credential_create_error'));
                        pageIsLoading = false;
                        return;
                    }
                    try {
                        let myVault = await popupPassmanClient.getFullVaultByGuid(defaultVaultInfo?.guid, true);
                        if (myVault && myVault.testVaultKey(defaultVaultInfo.password)) {
                            myVault.vaultKey = defaultVaultInfo.password;
                            if (myVault.credentials.length <= 1) {
                                await myVault.refresh(true);
                            }
                            vault = myVault;

                            credential = new Credential(vault, popupPassmanClient.server);
                            credentialData = credential.exportData();
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
                <OnClickButton callback={saveCredential} title="{i18n.getMessage('save')}"
                               bind:disabled="{lockSaveButton}">
                    {#if lockSaveButton}
                        <Icon data={refresh} scale={1.3} spin="{true}"/>
                    {:else}
                        <Icon data={save} scale={1.3}/>
                    {/if}
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.GENERAL)} title="{i18n.getMessage('general')}"
                               additionalClasses=""
                               disabled={!credential}>
                    <span>{i18n.getMessage('general')}</span>
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.FILES)}
                                title="{i18n.getMessage('files')}" additionalClasses=""
                                disabled={!credential}>
                    <span>{i18n.getMessage('files')}</span>
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.CUSTOM_FIELDS)}
                               title="{i18n.getMessage('custom_fields')}" additionalClasses=""
                               disabled={!credential}>
                    <span>{i18n.getMessage('custom_fields')}</span>
                </OnClickButton>
                <OnClickButton callback={() => openSection(CREDENTIAL_EDIT_SECTIONS.OTP)}
                                title="{i18n.getMessage('one_time_password')}" additionalClasses=""
                                disabled={!credential}>
                    <span>{i18n.getMessage('one_time_password')}</span>
                </OnClickButton>
            </div>
            <div class="flex flex-col p-5">
                {#if credentialData}
                    {#if selectedSection === CREDENTIAL_EDIT_SECTIONS.GENERAL}
                        <EditGeneral bind:credentialData/>
                    {/if}
                    {#if selectedSection === CREDENTIAL_EDIT_SECTIONS.FILES}
                        <EditFiles bind:credentialData bind:credential/>
                    {/if}
                    {#if selectedSection === CREDENTIAL_EDIT_SECTIONS.CUSTOM_FIELDS}
                        <EditCustomFields bind:credentialData bind:credential/>
                    {/if}
                    {#if selectedSection === CREDENTIAL_EDIT_SECTIONS.OTP}
                        <EditOTP bind:credentialData />
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</div>
