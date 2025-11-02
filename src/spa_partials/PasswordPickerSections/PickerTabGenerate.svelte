<script lang="ts">
    import { onMount } from "svelte";
    import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
    import type { PasswordGeneratorConfigurationInterface } from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
    import { PasswordPickerService } from "~/services/frontend/PasswordPickerService";
    import PasswordMeter from "~/spa_partials/PasswordMeter.svelte";
    import ExtendedPasswordInputField from "~/spa_partials/FormElements/ExtendedPasswordInputField.svelte";
    import { i18n } from "~/lib/i18n";
    import CustomCheckboxField from "~/spa_partials/FormElements/CustomCheckboxField.svelte";

    let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface = PasswordGeneratorService.getDefaultConfig();
    let password = '';

    onMount(async () => {
        passwordGeneratorConfiguration = await PasswordPickerService.getPasswordGeneratorConfiguration();
        password = PasswordGeneratorService.generate(passwordGeneratorConfiguration);
    });
</script>

<div class="tab-generate-content">
    <h2 class="text-sm font-bold mb-3">
        {i18n.getMessage('password_generator')}
    </h2>
    <div>
        <ExtendedPasswordInputField bind:value={password} label={undefined}
                                    bind:passwordGeneratorConfiguration iconScale={1.4}
        />
    </div>
    <div class="mt-[5px]">
        <PasswordMeter password={password}/>
    </div>

    <div class="mt-2">
        <div class="text-sm flex items-start space-x-2">
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
    </div>
</div>
