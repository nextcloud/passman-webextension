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
        .controller('SetupCtrl', ['$scope', '$timeout', '$location', '$rootScope', '$mdStepper', '$mdToast',
            function ($scope, $timeout, $location, $rootScope, $mdStepper, $mdToast) {
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
                disableAutoFill: false,
                disablePasswordPicker: false,
                debug: false
            };
            $scope.vaults = [];

            $scope.nextStep = function (stepName) {
                var steppers = $mdStepper('setup-stepper');

                $scope.saving = true;
                $scope.errors = [];
                $timeout(function () {
                    var step = stepName;
                    var check = $scope.check[step];
                    if (typeof check === "function") {
                        check(function (result) {
                            $scope.saving = false;
                            if (result) {
                                $scope.errors = [];
                                $scope.$apply();
                                steppers.next();
                            }
                            $timeout(function () {
                                $scope.errors = [];
                                $scope.$apply();
                            }, 5000);
                        });
                    }
                    else {
                        $scope.saving = false;
                        steppers.next();
                    }
                }, 10);


            };
            $scope.previousStep = function () {
                var steppers = $mdStepper('setup-stepper');
                steppers.back();
            };

            $scope.check = {
                server: function (callback) {
                    if(!$scope.settings.nextcloud_host){
                        $mdToast.showSimple(API.i18n.getMessage('invalid_host'));
                        callback(false);
                        return;
                    }
                    PAPI.host = $scope.settings.nextcloud_host;
                    PAPI.username = $scope.settings.nextcloud_username;
                    PAPI.password = $scope.settings.nextcloud_password;
                    PAPI.getVaults(function (vaults) {
                        if (vaults.hasOwnProperty('error')) {
                            $mdToast.showSimple(API.i18n.getMessage('invalid_response_from_server', [vaults.result.status, vaults.result.statusText]));
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
                    for (var i = 0; i < $scope.vaults.length; i++) {
                        var vault = $scope.vaults[i];
                        if (vault.guid === $scope.settings.default_vault.guid) {
                            $scope.settings.default_vault = angular.copy(vault);
                            break;
                        }
                    }
                    try {
                        PAPI.decryptString($scope.settings.default_vault.challenge_password, $scope.settings.vault_password);
                        callback(true);
                    }
                    catch (e) {
                        $mdToast.showSimple(API.i18n.getMessage('invalid_vault_password'));
                        callback(false);
                    }
                },
                master: function (callback) {
                    if ($scope.settings.master_password.trim() !== '') {
                        callback(true);
                    } else {
                        $mdToast.showSimple(API.i18n.getMessage('empty_master_key'));
                        callback(false);
                    }
                }
            };
            $scope.saving = false;


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

