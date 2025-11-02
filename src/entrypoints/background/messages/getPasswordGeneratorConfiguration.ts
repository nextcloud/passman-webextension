import ExtensionSettingsService, { ExtensionSettingsOptions } from "~/services/ExtensionSettingsService";
import { PasswordGeneratorService } from "@binsky/passman-client-ts/lib/Service/PasswordGeneratorService";
import type {
    PasswordGeneratorConfigurationInterface
} from "@binsky/passman-client-ts/lib/Interfaces/PasswordGeneratorService/PasswordGeneratorConfigurationInterface";
import { onMessage } from '../messaging';

export interface GetPasswordGeneratorConfigurationMessagingResponse {
    status: boolean;
    errorMessage?: string;
    passwordGeneratorConfiguration?: PasswordGeneratorConfigurationInterface;
}

onMessage('getPasswordGeneratorConfiguration', async () => {
    let status = false;
    let errorMessage = undefined;
    let passwordGeneratorConfiguration: PasswordGeneratorConfigurationInterface | undefined = undefined;

    try {
        // Get the password generator configuration from extension settings
        const storedConfig = await ExtensionSettingsService.getPartialExtensionSettings(ExtensionSettingsOptions.passwordGeneratorConfiguration, true);

        // Use stored configuration or fall back to default
        passwordGeneratorConfiguration = storedConfig ?? PasswordGeneratorService.getDefaultConfig();

        status = true;
    } catch (exception) {
        console.error('Error getting custom password generator configuration:', exception);
        errorMessage = 'Could not get custom password generator configuration';

        // Provide default configuration as fallback
        passwordGeneratorConfiguration = PasswordGeneratorService.getDefaultConfig();
    }

    return {
        status,
        errorMessage,
        passwordGeneratorConfiguration
    };
});
