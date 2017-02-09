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
        .controller('SetupCtrl', ['$scope', '$timeout', '$location', '$rootScope', 'StepsService', function ($scope, $timeout, $location, $rootScope, StepsService) {
            $scope.settings = {
                nextcloud_host: '',
                nextcloud_username: '',
                nextcloud_password: '',
                ignoreProtocol: true,
                ignoreSubdomain: true,
                ignorePath: true,
                generatedPasswordLength: 12,
                remember_password: true,
                remember_vault_password: true,
                vault_password: '',
                refreshTime: 60,
                default_vault: {},
                master_password: '',
                disableAutoFill: false
            };
            $scope.vaults = [];

            $scope.gogo = function (to) {
                StepsService.steps().goTo(to);
            };

            $scope.check = {
                server: function (callback) {
                    PAPI.host = $scope.settings.nextcloud_host;
                    PAPI.username = $scope.settings.nextcloud_username;
                    PAPI.password = $scope.settings.nextcloud_password;
                    PAPI.getVaults(function (vaults) {
                        if (vaults.hasOwnProperty('error')) {
                            $scope.errors.push("Invalid server settings!");

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
                        $scope.errors.push("Invalid vault key!");
                        callback(false);
                    }
                },
                master: function (callback) {
                    if ($scope.settings.master_password.trim() !== '') {
                        callback(true);
                    } else {
                        $scope.errors.push("Empty master key!");
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

            $scope.finished = function () {
                var settings = angular.copy($scope.settings);
                var master_password = settings.master_password;
                var master_password_remember = settings.master_password_remember;
                delete settings.master_password;
                delete settings.master_password_remember;
                $scope.saving = true;
                API.runtime.sendMessage(API.runtime.id, {
                    method: "setMasterPassword",
                    args: {password: master_password, savePassword: master_password_remember}
                })
                    .then(function () {
                        API.runtime.sendMessage(API.runtime.id, {
                            method: "saveSettings",
                            args: settings
                        }).then(function () {
                            setTimeout(function () {
                                window.location = '#!/';
                                $scope.saving = false;
                            }, 1500);
                        });
                    });


            };
        }]);
}());

