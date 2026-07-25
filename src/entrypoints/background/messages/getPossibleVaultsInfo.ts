import PassmanClientService from "~/services/PassmanClientService";
import { onMessage } from '../messaging';
import { i18n } from "~/lib/i18n";
import { logger } from "~/services/ConsoleLoggingService";

export type GetPossibleVaultsInfoRequest = {
    getCachedIfPossible?: boolean;
} | undefined;

export interface GetPossibleVaultsInfoResponse {
    status: boolean;
    errorMessage: string | null;
    vaultSelectionList: { guid: string, name: string }[]
}

onMessage('getPossibleVaultsInfo', async (message) => {
    let status = false;
    let errorMessage = null;
    let vaultSelectionList: { guid: string, name: string }[] = [];

    await PassmanClientService.getBackendPassmanClient().then(async (backendPassmanClient) => {
        if (backendPassmanClient) {
            try {
                await backendPassmanClient.preloadVaults(true, message.data?.getCachedIfPossible === true);

                for (let preloadedVault of backendPassmanClient.preloadedVaults) {
                    vaultSelectionList.push({
                        guid: preloadedVault.guid,
                        name: preloadedVault.name
                    });
                }
                status = true;
            } catch (exception) {
                logger.error(exception);
                if (exception instanceof Error) {
                    errorMessage = exception.message;
                } else {
                    errorMessage = i18n.getMessage('unknown_error');
                }
            }
        } else {
            errorMessage = i18n.getMessage('could_not_get_passman_client');
            logger.error(errorMessage);
        }
    });

    return {
        status,
        errorMessage,
        vaultSelectionList
    };
});
