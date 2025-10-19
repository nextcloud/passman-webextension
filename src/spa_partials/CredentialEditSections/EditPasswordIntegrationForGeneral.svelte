<script lang="ts">
    import type { CredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/CredentialInterface";
    import { onMount } from "svelte";
    import type {
        PasswordGeneratorConfigurationInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import CustomCheckboxField from "../FormElements/CustomCheckboxField.svelte";
    import MySveltyPicker from "../InteractionElements/MySveltyPicker.svelte";
    import { i18n } from "~/lib/i18n";

    export let credentialData: CredentialInterface;
    export let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface;

    let expire_time_string: string = "";
    let initDone = false;

    const updateExpireTime = (expire_time_string: string | null) => {
        if (initDone) {
            if (expire_time_string == null || expire_time_string === "") {
                credentialData.expire_time = 0;
            } else {
                credentialData.expire_time = parseInt(expire_time_string) / 1000;
            }
        }
    }

    $: updateExpireTime(expire_time_string);

    onMount(() => {
        if (credentialData.expire_time > 0) {
            expire_time_string = "" + credentialData.expire_time * 1000;
        }
        initDone = true;
    });
</script>

{#if credentialData && passwordGeneratorConfiguration}
    <div>
        <MySveltyPicker id="expire_date" label="{i18n.getMessage('expire_date')}" startDate="now"
                        bind:value={expire_time_string} placeholder="{i18n.getMessage('no_expire_date')}"/>
    </div>
    <h3 class="font-bold mt-4">
        {i18n.getMessage('password_generation_settings')}
    </h3>
    <div class="mt-2">
        <div class="text-sm mt-2 space-x-2">
            <span>{i18n.getMessage('pw_length')}:</span>
            <input type="number" bind:value={passwordGeneratorConfiguration.length} min="6"
                    class="dark:bg-neutral w-16"
                    style="-moz-appearance: initial; -webkit-appearance: initial;">
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.useUppercase}
                                    label={i18n.getMessage('use_uppercase')}
                                    id="useUppercase"/>
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.useLowercase}
                                    label={i18n.getMessage('use_lowercase')}
                                    id="useLowercase"/>
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.useDigits}
                                    label={i18n.getMessage('use_digits')}
                                    id="useDigits"/>
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.useSpecialChars}
                                    label={i18n.getMessage('use_special_chars')}
                                    id="useSpecialChars"/>
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.avoidAmbiguousCharacters}
                                    label={i18n.getMessage('avoid_ambiguous')}
                                    id="avoidAmbiguousCharacters"/>
        </div>
        <div class="mt-2">
            <CustomCheckboxField bind:value={passwordGeneratorConfiguration.requireEveryCharType}
                                    label={i18n.getMessage('require_every_character_type')}
                                    id="requireEveryCharType"/>
        </div>
    </div>
{/if}
