<script lang="ts">
    import CustomInputField from "../FormElements/CustomInputField.svelte";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import { onMount } from "svelte";
    import PasswordMeter from "~spa_partials/PasswordMeter.svelte";
    import exclamationCircle from "svelte-awesome/icons/exclamationCircle";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import ExtendedPasswordInputField from "../FormElements/ExtendedPasswordInputField.svelte";

    export let credentialData: DecryptedCredentialInterface;

    const i18n = chrome.i18n;
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
    <CustomInputField id="label" label="{i18n.getMessage('label')}"
                      bind:value={credentialData.label}/>
    <div class="mt-2">
        <CustomInputField id="username" label="{i18n.getMessage('username')}"
                          bind:value={credentialData.username}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="email" label="{i18n.getMessage('email')}"
                          bind:value={credentialData.email}/>
    </div>
    <div class="mt-2">
        <ExtendedPasswordInputField id="password" label="{i18n.getMessage('password')}"
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
                {i18n.getMessage('no_password_match')}
            </p>
        {/if}
    </div>
    <div class="mt-2">
        <ExtendedPasswordInputField id="password_repeat"
                                    label="{i18n.getMessage('password_repeat')}"
                                    bind:value={passwordRepeat}
                                    showCopyClipboardButton={false}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="url" label="{i18n.getMessage('url')}"
                          bind:value={credentialData.url}/>
    </div>
    <div class="mt-2">
        <CustomInputField id="description" label="{i18n.getMessage('description')}"
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
                {i18n.getMessage('compromised_notice')}
            </div>
        </div>
    {/if}
    <div class="mt-2">
        <OnClickButton additionalClasses="bg-red-600 hover:bg-red-500"
                       callback={markAsCompromised}>{i18n.getMessage('mark_compromised')}</OnClickButton>
    </div>
{/if}
