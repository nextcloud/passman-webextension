<script lang="ts">
    import PasswordMeter from "~spa_partials/PasswordMeter.svelte";
    import { onMount } from "svelte";
    import ExtendedPasswordInputField from "~spa_partials/FormElements/ExtendedPasswordInputField.svelte";
    import type {
        PasswordGeneratorConfigurationInterface
    } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import CustomCheckboxField from "~spa_partials/FormElements/CustomCheckboxField.svelte";
    import ExtensionSettingsService, { ExtensionSettingsOptions } from "~services/ExtensionSettingsService";
    import OnClickButton from "~spa_partials/InteractionElements/OnClickButton.svelte";
    import NotyService from "~services/frontend/NotyService";
    
    const i18n = chrome.i18n;
    let password = '';
    let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface = PasswordGeneratorService.getDefaultConfig();
    let initDone = false;

    const updateDefaultConfiguration = async () => {
        await ExtensionSettingsService.updatePartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, passwordGeneratorConfiguration);
        NotyService.notySuccess(i18n.getMessage('settings_updated_successfully'));
    }

    onMount(() => {
        ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, true).then(async (storedPasswordGeneratorConfiguration) => {
            passwordGeneratorConfiguration = storedPasswordGeneratorConfiguration ?? passwordGeneratorConfiguration;
            initDone = true;
            password = PasswordGeneratorService.generate(passwordGeneratorConfiguration);
        });
    });
</script>

<div class="p-5">
    <div>
        <ExtendedPasswordInputField label="{i18n.getMessage('password_generator')}" bind:value={password}
                                    bind:passwordGeneratorConfiguration iconScale={1.4}
        />
    </div>
    <div class="mt-[5px]">
        <PasswordMeter password={password}/>
    </div>

    <div class="mt-12">
        <div class="text-sm mt-2 space-x-2">
            <span>{i18n.getMessage('pw_length')}:</span>
            <input type="number" bind:value={passwordGeneratorConfiguration.length} min="6"
                   class="dark:bg-neutral border-2 rounded-md w-16">
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
        <div class="mt-4">
            <OnClickButton disabled={!initDone}
                           callback="{updateDefaultConfiguration}">
                {i18n.getMessage('update_default_settings')}
            </OnClickButton>
        </div>
    </div>
</div>
