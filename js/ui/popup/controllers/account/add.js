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
        .controller('AddAccountCtrl', ['$scope', '$timeout', '$location', '$rootScope', 'StepsService', 'notify', 'HttpsTest',
            function ($scope, $timeout, $location, $rootScope, StepsService, notify, HttpsTest) {
            $scope.settings = {
                nextcloud_host: '',
                nextcloud_username: '',
                nextcloud_password: '',
            };


            $scope.vaults = [];

            $scope.gogo = function (to) {
                StepsService.steps().goTo(to);
            };


            notify.config({
                'position': 'left',
                'duration': 2500
            });

            $scope.check = {
                server: function (callback) {
                    if (!$scope.settings.nextcloud_host || !$scope.settings.nextcloud_username || !$scope.settings.nextcloud_password) {
                        $scope.errors.push(API.i18n.getMessage('invalid_server_settings'));
                        callback(false);
                        return;
                    }
                    $scope.settings.nextcloud_host = $scope.settings.nextcloud_host.replace(/\/$/, "");
                    PAPI.host = $scope.settings.nextcloud_host;
                    PAPI.username = $scope.settings.nextcloud_username;
                    PAPI.password = $scope.settings.nextcloud_password;
                    PAPI.getVaults(function (vaults) {
                        if (vaults.hasOwnProperty('error')) {
                            var errors = API.i18n.getMessage('invalid_response_from_server', [vaults.result.status, vaults.result.statusText]);
                            $scope.errors.push(errors);
                            notify(errors);
                            callback(false);
                        }
                        else {
                            $scope.vaults = vaults;
                            callback(true);
                        }
                        $scope.$apply();
                    });
                },
                vault: function (callback) {
                    try {
                        PAPI.decryptString($scope.settings.default_vault.challenge_password, $scope.settings.vault_password);
                        callback(true);
                    }
                    catch (e) {
                        $scope.errors.push();
                        notify(API.i18n.getMessage('invalid_vault_password'));
                        callback(false);
                    }
                }
            };
            $scope.saving = false;
            $scope.next = function () {
                $scope.saving = true;
                $scope.errors = [];
                $timeout(function () {
                    var step = StepsService.getCurrent().name;
                    var check = $scope.check[step];
                    if (typeof check === "function") {
                        check(function (result) {
                            $scope.saving = false;
                            if (result) {
                                $scope.errors = [];
                                $scope.$apply();
                                StepsService.steps().next();
                            }
                            $timeout(function () {
                                $scope.errors = [];
                                $scope.$apply();
                            }, 5000);
                        });
                    }
                    else {
                        $scope.saving = false;
                        StepsService.steps().next();
                    }
                }, 10);
            };

            var handleCheck = function (resultUrl) {
                $scope.settings.nextcloud_host = resultUrl;
            };

            $scope.isHTTP = function (url) {
                return HttpsTest.isHTTP(url);
            };

            $scope.checkHost = function () {
                HttpsTest.test($scope.settings.nextcloud_host).then(handleCheck, handleCheck);
            };

            $scope.cancelAdd = function () {
                window.location = '#!/settings/2';
            };

            $scope.finished = function () {
                var _settings = angular.copy($scope.settings);

                var account = {
                    nextcloud_host: _settings.nextcloud_host,
                    nextcloud_username: _settings.nextcloud_username,
                    nextcloud_password: _settings.nextcloud_password,
                    vault: _settings.default_vault,
                    vault_password: _settings.vault_password
                };
                $scope.saving = true;
                API.runtime.sendMessage(API.runtime.id, {'method': 'getRuntimeSettings'}).then(function (settings) {
                    settings.accounts.push(account);
                    API.runtime.sendMessage(API.runtime.id, {
                        method: "saveSettings",
                        args: settings
                    }).then(function () {
                        setTimeout(function () {
                            notify(API.i18n.getMessage('account_added'));
                            $scope.saving = false;
                            window.location = '#!/settings/2';
                        }, 750);
                    });

                });
            };
        }]);
}());

