import type {
    NextcloudServerInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInterface";
import type { LoggingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/LoggingHandlerInterface";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServer } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";
import CustomStorageService from "@/services/CustomStorageService";
import { NextcloudServerMessagingConnectorService } from "@/services/NextcloudServerMessagingConnectorService";
import PassmanClientService from "@/services/PassmanClientService";
import { sendMessage } from "@/entrypoints/background/messaging";

export class NextcloudServerMessagingConnector extends NextcloudServer implements NextcloudServerInterface {

    /**
     * Create NextcloudServerMessagingConnector instance.
     * Instead of directly executing fetch requests, request / response data will be transferred to the background service worker through the messaging api.
     * @param serverData
     * @param logger
     * @throws ConfigurationError
     */
    constructor(serverData: NextcloudServerInfoInterface, logger: LoggingHandlerInterface) {
        super(serverData, logger, CustomStorageService.getExtensionPassmanClientPersistenceService());
    }

    private readonly handleConnectorJsonResponse = <T>(response: any, errorCallback: (response: Error) => void): T | void => {
        if (response.error) {
            return errorCallback(response.error);
        }

        console.log(response.response);
        if (!response.response) {
            return;
        }
        if (response.response.status >= 400) {
            const data = response.response.json;
            this.logger.onError(data.message);
            return;
        }
        return (response.response.json) as T;
    };

    /**
     * Do a response typed get request in the background service worker.
     * Caching is handled by the shared IndexedDB model store on PassmanClient (getFullVaultByGuid / restore),
     * not by raw GET JSON request-cache keys, as it was before.
     * @param endpoint
     * @param errorCallback
     * @deprecated request cache will no longer be used; find a new solution for this if required here.
     * @param getCachedIfPossible unused here; model-store reads happen at the PassmanClient layer
     */
    getJson = async <T>(endpoint: string, errorCallback: (response: Error) => void, getCachedIfPossible: boolean = false): Promise<T | void> => {
        return sendMessage('nextcloudServerMessagingConnectorApi', {
            url: this.getApiUrl() + endpoint,
            init: {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Basic ${this.getEncodedLogin()}`
                },
                credentials: 'omit',
            }
        }).then(async (value) => {
            const jsonResponse = this.handleConnectorJsonResponse<T>(value, errorCallback);
            // todo: check again if we can use this here; got a request loop here last time, so it's disabled for now
            /*await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                'GET',
                this.getApiUrl() + endpoint,
                jsonResponse,
                await PassmanClientService.getPopupPassmanClient()
            );*/
            return jsonResponse;
        });
    };

    /**
     * Do a response typed delete request in the background service worker.
     * @param endpoint
     * @param errorCallback
     */
    deleteJson = async <T>(endpoint: string, errorCallback: (response: Error) => void): Promise<T | void> => {
        return sendMessage('nextcloudServerMessagingConnectorApi', {
            url: this.getApiUrl() + endpoint,
            init: {
                method: 'DELETE',
                headers: {
                    Authorization: `Basic ${this.getEncodedLogin()}`
                },
                credentials: 'omit',
            }
        }).then(async (value) => {
            const jsonResponse = this.handleConnectorJsonResponse<T>(value, errorCallback);
            const popupClient = await PassmanClientService.getPopupPassmanClient();
            if (popupClient) {
                await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                    'DELETE',
                    this.getApiUrl() + endpoint,
                    jsonResponse,
                    popupClient
                );
            } else {
                this.logger.onWarning('Could not get popup passman client, skipping popup update after deleteJson');
            }
            return jsonResponse;
        });
    };

    /**
     * Do a response typed post request in the background service worker.
     * @param endpoint
     * @param data will be converted to a json string
     * @param errorCallback
     * @param method
     */
    postJson = async <T>(endpoint: string, data: [] | object | null, errorCallback: (response: Error) => void, method: string = 'POST'): Promise<T | void> => {
        return sendMessage('nextcloudServerMessagingConnectorApi', {
            url: this.getApiUrl() + endpoint,
            init: {
                method: method,
                headers: {
                    Accept: 'application/json',
                    Authorization: `Basic ${this.getEncodedLogin()}`,
                    "Content-Type": "application/json",
                },
                credentials: 'omit',
                body: JSON.stringify(data),
            }
        }).then(async (value) => {
            const jsonResponse = this.handleConnectorJsonResponse<T>(value, errorCallback);
            const popupClient = await PassmanClientService.getPopupPassmanClient();
            if (popupClient) {
                await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                    method,
                    this.getApiUrl() + endpoint,
                    jsonResponse,
                    popupClient
                );
            } else {
                this.logger.onWarning('Could not get popup passman client, skipping popup update after postJson');
            }
            return jsonResponse;
        });
    };
}
