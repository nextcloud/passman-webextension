import PassmanClientService from "~/services/PassmanClientService";
import { onMessage } from '../messaging';

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
                console.error(exception);
                if (exception instanceof Error) {
                    errorMessage = exception.message;
                } else {
                    errorMessage = "Unknown error";
                }
            }
        } else {
            errorMessage = "setDefaultVault message: could not get passman client";
            console.error(errorMessage);
        }
    });

    return {
        status,
        errorMessage,
        vaultSelectionList
    };
});
