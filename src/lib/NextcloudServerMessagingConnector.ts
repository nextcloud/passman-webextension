import type {
    NextcloudServerInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInterface";
import type { LoggingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/LoggingHandlerInterface";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServer } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";
import { sendToBackground } from "@plasmohq/messaging";
import CustomStorageService from "~services/CustomStorageService";
import { DefaultPersistenceService } from "@binsky/passman-client-ts/lib/Service/DefaultPersistenceService";
import { NextcloudServerMessagingConnectorService } from "~services/NextcloudServerMessagingConnectorService";
import ExtensionSettingsService from "~services/ExtensionSettingsService";

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
        // super(serverData, logger, new DefaultPersistenceService()); // disable caching for this frontend (popup) instance
    }

    private handleConnectorJsonResponse = async <T>(response: any, errorCallback: (response: Error) => void): Promise<T | void> => {
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
     * @param endpoint
     * @param errorCallback
     * @param getCachedIfPossible
     */
    getJson = async <T>(endpoint: string, errorCallback: (response: Error) => void, getCachedIfPossible: boolean = false): Promise<T | void> => {
        const cachePrefix = 'cache-getJson-';
        const requestCacheHandler = this.persistence.getRequestCacheHandler();
        if (getCachedIfPossible && requestCacheHandler) {
            const cachedValue = await requestCacheHandler.get(cachePrefix + endpoint);
            if (cachedValue && cachedValue !== '') {
                try {
                    return JSON.parse(cachedValue) as T;
                } catch (e) {
                    // ignore all exceptions, just continue with the non-cached request logic
                    console.debug(e);
                }
            }
        }

        return sendToBackground({
            name: "nextcloudServerMessagingConnectorApi",
            body: {
                url: this.getApiUrl() + endpoint,
                init: {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Basic ${this.getEncodedLogin()}`
                    },
                    credentials: 'omit',
                }
            }
        }).then(async (value) => {
            const jsonResponse = await this.handleConnectorJsonResponse<T>(value, errorCallback);
            // todo: check again if we can use this here; got a request loop here last time, so it's disabled for now
            /*await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                'GET',
                this.getApiUrl() + endpoint,
                jsonResponse,
                await ExtensionSettingsService.getPopupPassmanClient()
            );*/

            const requestCacheHandler = this.persistence.getRequestCacheHandler();
            if (requestCacheHandler) {
                try {
                    await requestCacheHandler.set(cachePrefix + endpoint, JSON.stringify(jsonResponse));
                } catch (e) {
                    console.warn('Failed to cache ' + endpoint, e);
                }
            }
            return jsonResponse;
        });
    };

    /**
     * Do a response typed delete request in the background service worker.
     * @param endpoint
     * @param errorCallback
     */
    deleteJson = async <T>(endpoint: string, errorCallback: (response: Error) => void): Promise<T | void> => {
        return sendToBackground({
            name: "nextcloudServerMessagingConnectorApi",
            body: {
                url: this.getApiUrl() + endpoint,
                init: {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Basic ${this.getEncodedLogin()}`
                    },
                    credentials: 'omit',
                }
            }
        }).then(async (value) => {
            const jsonResponse = await this.handleConnectorJsonResponse<T>(value, errorCallback);
            await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                'DELETE',
                this.getApiUrl() + endpoint,
                jsonResponse,
                await ExtensionSettingsService.getPopupPassmanClient()
            );
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
        return sendToBackground({
            name: "nextcloudServerMessagingConnectorApi",
            body: {
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
            }
        }).then(async (value) => {
            const jsonResponse = await this.handleConnectorJsonResponse<T>(value, errorCallback);
            await NextcloudServerMessagingConnectorService.updatePopupPassmanClient(
                method,
                this.getApiUrl() + endpoint,
                jsonResponse,
                await ExtensionSettingsService.getPopupPassmanClient()
            );
            return jsonResponse;
        });
    };
}
