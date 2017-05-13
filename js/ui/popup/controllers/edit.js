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
        .controller('EditCtrl', ['$scope', '$routeParams', '$timeout', 'notify', function ($scope, $routeParams, $timeout, notify) {
            API.runtime.sendMessage(API.runtime.id, {
                method: "getCredentialByGuid",
                args: $routeParams.guid
            }).then(function (credential) {
                $scope.credential = credential;
                $scope.credential.password_repeat = angular.copy(credential.password);
                $scope.$apply();
            });

            var storage = new API.Storage();

            $scope.tabActive = 1;

            function genPwd(settings) {
                /* jshint ignore:start */
                var password = generatePassword(settings['length'],
                    settings.useUppercase,
                    settings.useLowercase,
                    settings.useDigits,
                    settings.useSpecialChars,
                    settings.minimumDigitCount,
                    settings.avoidAmbiguousCharacters,
                    settings.requireEveryCharType);
                /* jshint ignore:end */
                return password;
            }

            $scope.pw_settings = null;
            function getPasswordGenerationSettings(cb) {
                var default_settings = {
                    'length': 12,
                    'useUppercase': true,
                    'useLowercase': true,
                    'useDigits': true,
                    'useSpecialChars': true,
                    'minimumDigitCount': 3,
                    'avoidAmbiguousCharacters': false,
                    'requireEveryCharType': true
                };
                storage.get('password_generator_settings').then(function (_settings) {
                    if (!_settings) {
                        _settings = default_settings;
                    }

                    $scope.pw_settings = _settings;
                }).error(function () {
                    $scope.pw_settings = default_settings;
                });
            }

            getPasswordGenerationSettings();

            var custom_field = {
                label: '',
                value: '',
                field_type: 'text',
                secret: false
            };

            $scope.new_custom_field = angular.copy(custom_field);

            $scope.addCustomField = function (_field) {
                var field = angular.copy(_field);
                if (!field.label || !field.value) {
                    return;
                }
                $scope.credential.custom_fields.push(field);
                $scope.new_custom_field = angular.copy(custom_field);
            };

            $scope.deleteCustomField = function (field) {
                var idx = $scope.credential.custom_fields.indexOf(field);
                $scope.credential.custom_fields.splice(idx, 1);
            };

            $scope.pwFieldShown = false;

            $scope.togglePwField = function () {
                $scope.pwFieldShown = !$scope.pwFieldShown;
            };

            var round = 0;
            $scope.generatePassword = function () {
                var new_password = genPwd($scope.pw_settings);
                $scope.credential.password = new_password;
                $scope.credential.password_repeat = new_password;
                $timeout(function () {
                    if (round < 10) {
                        $scope.generatePassword();
                        round++;
                    } else {
                        round = 0;
                    }
                }, 10);
            };
            $scope.saving = false;
            $scope.saveCredential = function () {
                $scope.saving = true;
                if (!$scope.credential.label) {
                    notify(API.i18n.getMessage('label_required'));
                    return;
                }

                if ($scope.credential.password !== $scope.credential.password_repeat) {
                    notify(API.i18n.getMessage('no_password_match'));
                    return;
                }

                if ($scope.new_custom_field.label && $scope.new_custom_field.value) {
                    $scope.credential.custom_fields.push(angular.copy($scope.new_custom_field));
                }
                delete $scope.credential.password_repeat;

                API.runtime.sendMessage(API.runtime.id, {
                    method: "saveCredential",
                    args: $scope.credential
                }).then(function (credential) {
                    $scope.saving = false;
                    if (!$scope.credential.credential_id) {
                        notify(API.i18n.getMessage('credential_created'));
                    } else {
                        notify(API.i18n.getMessage('credential_updated'));
                    }
                    window.location = '#!/';
                });

            };

            $scope.cancel = function () {
                window.location = '#!/';
            };


        }]);
}());
