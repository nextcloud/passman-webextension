<script lang="ts">
    import CustomInputField from "../FormElements/CustomInputField.svelte";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import type { CredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/CredentialInterface";
    import { onMount } from "svelte";
    import PasswordMeter from "~spa_partials/PasswordMeter.svelte";
    import exclamationCircle from "svelte-awesome/icons/exclamationCircle";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import ExtendedPasswordInputField from "../FormElements/ExtendedPasswordInputField.svelte";

    export let credentialData: CredentialInterface;

    let password = "", passwordRepeat = "";
    let initDone = false;

    const markAsCompromised = () => {
        console.log('markAsCompromised');
        credentialData.compromised = true;
    }

    const checkUpdatePasswordField = () => {
        if (initDone) {
            if (password == passwordRepeat) {
                credentialData.password = password;
            } else {
                credentialData.password = undefined;
            }
        }
    }

    $: password && passwordRepeat && checkUpdatePasswordField();

    onMount(() => {
        password = credentialData.password;
        passwordRepeat = credentialData.password;
        initDone = true;
    });
</script>

{#if credentialData}
    <CustomInputField id="label" label="{chrome.i18n.getMessage('label')}"
                      bind:value={credentialData.label}/>
    <div class="mt-2">
        <CustomInputField id="username" label="{chrome.i18n.getMessage('username')}"
                          bind:value={credentialData.username}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="email" label="{chrome.i18n.getMessage('email')}"
                          bind:value={credentialData.email}/>
    </div>
    <div class="mt-2">
        <ExtendedPasswordInputField id="password" label="{chrome.i18n.getMessage('password')}"
                                    bind:value={password}
                                    passwordGeneratorConfiguration={PasswordGeneratorService.getDefaultConfig()}
                                    afterPWGenCallback={(generated) => {
                                                        passwordRepeat = generated;
                                                    }}
        />
    </div>
    <div class="mt-[5px]">
        <PasswordMeter password={password}/>
        {#if password !== passwordRepeat}
            <p class="text-red-500">
                {chrome.i18n.getMessage('no_password_match')}
            </p>
        {/if}
    </div>
    <div class="mt-2">
        <ExtendedPasswordInputField id="password_repeat"
                                    label="{chrome.i18n.getMessage('password_repeat')}"
                                    bind:value={passwordRepeat}
                                    showCopyClipboardButton={false}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="url" label="{chrome.i18n.getMessage('url')}"
                          bind:value={credentialData.url}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="description" label="{chrome.i18n.getMessage('description')}"
                          bind:value={credentialData.description}
                          type="textarea"/>
    </div>
    <!--<div class="mt-2">
        Tags ...
    </div>-->
    {#if credentialData.compromised}
        <div class="mt-2">
            <div class="text-sm text-red-600 !mb-4">
                <Icon data={exclamationCircle} scale={1.0}/>
                {chrome.i18n.getMessage('compromised_notice')}
            </div>
        </div>
    {/if}
    <div class="mt-2">
        <OnClickButton additionalClasses="bg-red-600 hover:bg-red-500"
                       callback="{markAsCompromised}">{chrome.i18n.getMessage('mark_compromised')}</OnClickButton>
    </div>
{/if}
