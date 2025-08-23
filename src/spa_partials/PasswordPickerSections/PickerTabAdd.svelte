<script lang="ts">
    import { onMount } from "svelte";
    import { PASSWORD_PICKER_SECTIONS, PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import { i18n } from "~lib/i18n";
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import CustomInputField from "~spa_partials/FormElements/CustomInputField.svelte";
    import ExtendedPasswordInputField from "~spa_partials/FormElements/ExtendedPasswordInputField.svelte";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { refresh, save } from "svelte-awesome/package/icons";

    export let selectedSection: PASSWORD_PICKER_SECTIONS;

    let credentialData: Partial<DecryptedCredentialInterface> = {};
    let password = "", passwordRepeat = "";
    let isSaving = false;
    let saveMessage = "";
    let saveMessageType: "success" | "error" | "" = "";
    let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface = PasswordGeneratorService.getDefaultConfig();
    let initDone = false;

    const checkUpdatePasswordField = () => {
        if (initDone) {
            if (password == passwordRepeat) {
                credentialData.password = password;
            } else {
                credentialData.password = undefined!;
            }
        }
    }

    $: password && passwordRepeat && checkUpdatePasswordField();

    const saveCredential = async () => {
        if (!credentialData.label || credentialData.label.trim().length === 0) {
            saveMessage = i18n.getMessage('label_required');
            saveMessageType = "error";
            return;
        }

        isSaving = true;
        saveMessage = "";
        saveMessageType = "";

        try {
            const result = await PasswordPickerService.createCredentialFromPicker(credentialData);
            
            if (result.status) {
                saveMessage = i18n.getMessage('credential_created');
                saveMessageType = "success";
                
                // Clear form after successful save
                setTimeout(() => {
                    credentialData = {};
                    password = "";
                    passwordRepeat = "";
                    saveMessage = "";
                    saveMessageType = "";

                    // route back to picker credential list, if the user is still on this tab
                    if (selectedSection === PASSWORD_PICKER_SECTIONS.ADD) {
                        selectedSection = PASSWORD_PICKER_SECTIONS.LIST;
                    }
                }, 2000);
            } else {
                saveMessage = result.errorMessage || i18n.getMessage('credential_create_error');
                saveMessageType = "error";
            }
        } catch (error) {
            console.error('Error creating credential:', error);
            saveMessage = i18n.getMessage('credential_create_error');
            saveMessageType = "error";
        }

        isSaving = false;
    };

    const cancelAdd = () => {
        credentialData = {};
        password = "";
        passwordRepeat = "";
        saveMessage = "";
        saveMessageType = "";
        PasswordPickerService.hidePicker();
    };

    onMount(async () => {
        // Pre-fill form with data from current page
        const formData = PasswordPickerService.getFormDataFromCurrentPage();
        credentialData = { ...formData };
        
        // Set password fields if password was detected
        if (formData.password) {
            password = formData.password;
            passwordRepeat = formData.password;
        }

        // Get password generator configuration
        passwordGeneratorConfiguration = await PasswordPickerService.getPasswordGeneratorConfiguration();
        
        initDone = true;
    });
</script>

{#if credentialData}
    <h2 class="text-sm font-bold mb-3">{i18n.getMessage('save_site')}</h2>
    
    <CustomInputField 
        id="label" 
        label="{i18n.getMessage('label')}"
        bind:value={credentialData.label}
    />
    
    <div class="mt-2">
        <CustomInputField 
            id="username" 
            label="{i18n.getMessage('username')}"
            bind:value={credentialData.username}
        />
    </div>

    <div class="mt-2">
        <CustomInputField
            id="email"
            label="{i18n.getMessage('email')}"
            bind:value={credentialData.email}
        />
    </div>
    
    <div class="mt-2">
        <ExtendedPasswordInputField 
            id="password" 
            label="{i18n.getMessage('password')}"
            bind:value={password}
            bind:passwordGeneratorConfiguration={passwordGeneratorConfiguration}
            afterPWGenCallback={(generated) => {
                passwordRepeat = generated;
            }}
            showCopyClipboardButton={false}
        />
    </div>
    
    <div class="mt-2">
        <ExtendedPasswordInputField 
            id="password_repeat"
            label="{i18n.getMessage('password_repeat')}"
            bind:value={passwordRepeat}
            showCopyClipboardButton={false}
            showHiddenToggle={false}
        />
    </div>
    
    {#if password !== passwordRepeat}
        <p class="text-red-500 text-xs mt-1">
            {i18n.getMessage('no_password_match')}
        </p>
    {/if}
    
    <div class="mt-2">
        <CustomInputField 
            id="url" 
            label="{i18n.getMessage('url')}"
            bind:value={credentialData.url}
        />
    </div>

    <div class="mt-2">
        <CustomInputField 
            id="description" 
            label="{i18n.getMessage('description')}"
            bind:value={credentialData.description}
            type="textarea"
        />
    </div>
    
    {#if saveMessage}
        <div class="mt-2 p-2 rounded text-xs {saveMessageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            {saveMessage}
        </div>
    {/if}
    
    <small class="block text-xs text-gray-600 mt-2 mb-2">{i18n.getMessage('add_hint')}</small>
    
    <div class="flex gap-2 mt-3">
        <OnClickButton 
            callback={saveCredential} 
            title="{i18n.getMessage('save')}"
            additionalClasses="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1"
            disabled={isSaving || password !== passwordRepeat}
        >
            {#if isSaving}
                <Icon data={refresh} scale={0.8} spin={true}/>
            {:else}
                <Icon data={save} scale={0.8}/>
            {/if}
            <span class="ml-1">{i18n.getMessage('save')}</span>
        </OnClickButton>
        
        <OnClickButton 
            callback={cancelAdd}
            title="{i18n.getMessage('cancel')}"
            additionalClasses="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-3 py-1"
            disabled={isSaving}
        >
            <span>{i18n.getMessage('cancel')}</span>
        </OnClickButton>
    </div>
{/if}
