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

    /**
     * @ngdoc function
     * @name passmanApp.controller:MainCtrl
     * @description
     * # MainCtrl
     * Controller of the passmanApp
     */
    angular.module('passmanExtension')
        .controller('ListCtrl', ['$scope', 'Settings', '$location', '$rootScope', function ($scope, Settings, $window, $rootScope) {
            $scope.app = 'passman';
            var port = API.runtime.connect(null, {
                name: "PassmanCommunication"
            });

            var messageParser = function (message) {
                var e = message.split(':');

                switch (e[0]) {
                    case "credential_amount":
                        $scope.credential_amount = e[1];
                        $scope.refreshing_credentials = false;
                }

                $scope.$apply();
            };

            /**
             * Connect to the background service
             */
            var initApp = function () {
                port.onMessage.addListener(messageParser);
                API.runtime.sendMessage(API.runtime.id, {method: "getMasterPasswordSet"}).then(function (isPasswordSet) {
                    function redirectToPrompt() {
                        window.location = '#!/locked';
                        return;
                    }

                    //First check attributes
                    if (!isPasswordSet) {
                        redirectToPrompt();
                        return;
                    }

                    getActiveTab();
                    $scope.refreshing_credentials = true;
                    setTimeout(function () {
                        port.postMessage("credential_amount");
                    }, 500);
                });
            };

            $scope.refreshing_credentials = false;
            $scope.refresh = function () {
                $scope.refreshing_credentials = true;
                API.runtime.sendMessage(API.runtime.id, {method: "getCredentials"}).then(function () {
                    setTimeout(function () {
                        port.postMessage("credential_amount");
                    }, 2000);
                });
            };

            var getActiveTab = function (cb) {
                API.tabs.query({currentWindow: true, active: true}).then(function (tab) {
                    API.runtime.sendMessage(API.runtime.id, {
                        method: "getCredentialsByUrl",
                        args: [tab[0].url]
                    }).then(function (_logins) {
                        //var url = backgroundPage.processURL(tab.url, $rootScope.app_settings.ignoreProtocol, $rootScope.app_settings.ignoreSubdomain, $rootScope.app_settings.ignorePath);
                        $scope.found_credentials = _logins;
                        $scope.$apply();
                    });
                });
            };

            $scope.lockExtension = function () {
                API.runtime.sendMessage(API.runtime.id, {method: "setMasterPassword", args: {password: null}}).then(function () {
                    window.location = '#!/locked';
                });
            };

            API.runtime.sendMessage(API.runtime.id, {'method': 'getRuntimeSettings'}).then(function (settings) {

                $rootScope.app_settings = settings;
                if (!settings || Object.keys(settings).length === 0) {
                    window.location = '#!/setup';
                } else if (settings.hasOwnProperty('isInstalled')) {
                    window.location = '#!/locked';
                } else {
                    initApp();
                }
            });


            $scope.editCredential = function (credential) {
                window.location = '#!/edit/' + credential.guid;
            };
        }]);
}());

