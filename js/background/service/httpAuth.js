/* global API */

/**
 * Nextcloud - passman
 *
 * @copyright Copyright (c) 2016, Sander Brand (brantje@gmail.com)
 * @copyright Copyright (c) 2016, Marcos Zuriaga Miguel (wolfi@wolfi.es)
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function () {
    'use strict';
    var pendingRequests = [];

    API.runtime.connect();
    // A request has completed.
    // We can stop worrying about it.
    function completed(requestDetails) {
        var index = pendingRequests.indexOf(requestDetails.requestId);
        if (index > -1) {
            pendingRequests.splice(index, 1);
        }
    }

    var auth_tries = [];
    var provideCredentialsSync = function (requestDetails) {
        if (!auth_tries[requestDetails.requestId]) {
            auth_tries[requestDetails.requestId] = 0;
        }
        /** global: background */
        var login = background.getCredentialForHTTPAuth(requestDetails);

        // If we have seen this request before, then
        // assume our credentials were bad, and give up.
        if (pendingRequests.indexOf(requestDetails.requestId) === -1) {
            pendingRequests.push(requestDetails.requestId);
            return {
                authCredentials: {
                    username: login.username,
                    password: login.password
                }
            };

        } else {
            console.warn("bad credentials for: " + requestDetails.url + ', Showing login dialog');
            //return {cancel: true};
            return undefined;
        }

    };


    API.webRequest.onAuthRequired.addListener(provideCredentialsSync, {urls: ["<all_urls>"]}, ["blocking"]);

    API.webRequest.onCompleted.addListener(
        completed,
        {urls: ["<all_urls>"]}
    );

    API.webRequest.onErrorOccurred.addListener(
        completed,
        {urls: ["<all_urls>"]}
    );
}());