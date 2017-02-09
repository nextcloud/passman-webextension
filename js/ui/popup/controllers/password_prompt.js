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
        .controller('PasswordPromptCtrl', ['$scope', 'Settings', '$location', '$rootScope', function ($scope, Settings, $window, $rootScope) {
            $scope.settings = {};

            API.runtime.sendMessage(API.runtime.id, {method: "getMasterPasswordSet"}).then(function(isSet) {
                $scope.masterPwSet = isSet;
                $scope.$apply();
            });

            $scope.master_password = '';
            $scope.apply_settings = function() {
                $scope.saving = true;
                $scope.inValidPassword = false;
                API.runtime.sendMessage(API.runtime.id, {method: 'isMasterPasswordValid', args: $scope.master_password }).then(function (isValid) {
                    if(isValid){
                        API.runtime.sendMessage(API.runtime.id, {method: "setMasterPassword", args: {password: $scope.master_password, savePassword: $scope.master_password_remember} }).then(function () {
                            setTimeout(function () {
                                window.location = '#!/';
                                $scope.saving = false;
                                $scope.saving = false;
                            },1500);
                        });
                    } else {
                        $scope.saving = false;
                        $scope.inValidPassword = true;
                    }
                    $scope.$apply();
                })

            };
        }]);
}());

