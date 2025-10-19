<script lang="ts">
    import CustomInputField from "../FormElements/CustomInputField.svelte";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import type { DecryptedCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/DecryptedCredentialInterface";
    import { onMount } from "svelte";
    import PasswordMeter from "~/spa_partials/PasswordMeter.svelte";
    import exclamationCircle from "svelte-awesome/icons/exclamationCircle";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import ExtendedPasswordInputField from "../FormElements/ExtendedPasswordInputField.svelte";
    import { createTagsInput, melt, type Tag } from '@melt-ui/svelte';
    import type { TagInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/TagInterface";
    import EditPasswordIntegrationForGeneral from "./EditPasswordIntegrationForGeneral.svelte";
    import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
    import { i18n } from "~/lib/i18n";

    interface DefiniteTagInterface extends TagInterface {
        text: string;
    }

    export let credentialData: DecryptedCredentialInterface;

    let password = "", passwordRepeat = "";
    let initDone = false;
    let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface = PasswordGeneratorService.getDefaultConfig();
    let showExtendedPasswordSettings = false;
    const {
        elements: { root, input, tag, deleteTrigger },
        states: { tags: tagsStore }
    } = createTagsInput({
        unique: true,
        add: (tag: string) => {
            if (tag.length <= 2) return Promise.reject('Tag must be longer than 2 characters');
            return { id: tag, value: tag };
        }
    });

    const markAsCompromised = () => {
        console.log('markAsCompromised');
        credentialData.compromised = true;
    }

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

    onMount(async () => {
        if (credentialData?.tags) {
            let filteredTags: DefiniteTagInterface[] = credentialData.tags.filter(tag => tag.text !== undefined) as DefiniteTagInterface[];
            tagsStore.set(filteredTags.map(_value => { return { id: _value.text, value: _value.text }}));
        } else {
            tagsStore.set([]);
        }
        tagsStore.subscribe(tags => {
            if (initDone) {
                credentialData.tags = tags.map(value => {
                    return { text: value.value }
                });
            }
        });

        passwordGeneratorConfiguration = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, true) ?? passwordGeneratorConfiguration;

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
                                    bind:passwordGeneratorConfiguration={passwordGeneratorConfiguration}
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
        <button class="bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200" on:click={() => {
            showExtendedPasswordSettings = !showExtendedPasswordSettings;
        }}>
            {i18n.getMessage('toggle_extended_password_settings')}
        </button>
        {#if showExtendedPasswordSettings}
            <div class="mt-2 bg-slate-100 p-2 rounded-md">
                <EditPasswordIntegrationForGeneral bind:credentialData={credentialData} bind:passwordGeneratorConfiguration={passwordGeneratorConfiguration}/>
            </div>
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
    <div class="mt-2">
        {#if initDone}
            <div use:melt={melt($root)} class="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-md">
                {#each $tagsStore as t}
                    <div use:melt={melt($tag(t))} class="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                        <span>{t.value}</span>
                        <button use:melt={melt($deleteTrigger(t))} class="text-gray-500 hover:text-gray-700">
                            ×
                        </button>
                    </div>
                {/each}
                <input
                    use:melt={melt($input)}
                    type="text"
                    placeholder="Add a tag"
                    class="flex-1 min-w-[120px] outline-none bg-transparent"
                />
            </div>
        {/if}
    </div>
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
