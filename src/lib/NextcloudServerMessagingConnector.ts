import type {
    NextcloudServerInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInterface";
import type { LoggingHandlerInterface } from "@binsky/passman-client-ts/lib/Interfaces/LoggingHandlerInterface";
import type {
    NextcloudServerInfoInterface
} from "@binsky/passman-client-ts/lib/Interfaces/NextcloudServer/NextcloudServerInfoInterface";
import { NextcloudServer } from "@binsky/passman-client-ts/lib/Model/NextcloudServer";
import { sendToBackground } from "@plasmohq/messaging";

export class NextcloudServerMessagingConnector extends NextcloudServer implements NextcloudServerInterface {

    /**
     * Create NextcloudServerMessagingConnector instance.
     * Instead of directly executing fetch requests, request / response data will be transferred to the background service worker through the messaging api.
     * @param serverData
     * @param logger
     * @throws ConfigurationError
     */
    constructor(serverData: NextcloudServerInfoInterface, logger: LoggingHandlerInterface) {
        super(serverData, logger);
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
     */
    getJson = async <T>(endpoint: string, errorCallback: (response: Error) => void): Promise<T | void> => {
        return sendToBackground({
            name: "nextcloudServerMessagingConnectorApi",
            body: {
                url: this.getApiUrl() + endpoint,
                init: {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Basic ${this.getEncodedLogin()}`
                    }
                }
            }
        }).then(async (value) => this.handleConnectorJsonResponse<T>(value, errorCallback));
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
                    }
                }
            }
        }).then(async (value) => this.handleConnectorJsonResponse<T>(value, errorCallback));
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
                    body: JSON.stringify(data),
                }
            }
        }).then(async (value) => this.handleConnectorJsonResponse<T>(value, errorCallback));
    };
}
