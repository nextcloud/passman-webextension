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
        .controller('MainCtrl', ['$scope', '$mdSidenav', '$rootScope', function ($scope,  $mdSidenav, $rootScope) {
            function buildToggler(navID) {
                return function() {
                    // Component lookup should always be available since we are not using `ng-if`
                    $mdSidenav(navID)
                        .toggle();
                };
            }

            $scope.toolbarShown = true;

            $rootScope.$on('lockExtension', function () {
                $scope.lockExtension();
            });

            $rootScope.$on('unlocked', function () {
                $scope.toolbarShown = true;
            });

            $scope.toggleLeft = buildToggler('left');

            $scope.lockExtension = function () {
                $scope.toolbarShown = false;
                API.runtime.sendMessage(API.runtime.id, {method: "setMasterPassword", args: {password: null}}).then(function () {
                    window.location = '#!/locked';
                });
            };

            $scope.goto_list = function () {
                window.location = '#!/';
                $mdSidenav('left').close();
            };
            $scope.goto_settings = function () {
                window.location = '#!/settings';
                $mdSidenav('left').close();
            };

            $scope.goto_search = function () {
                window.location = '#!/search';
                $mdSidenav('left').close();
            };

            API.runtime.sendMessage(API.runtime.id, {'method': 'getRuntimeSettings'}).then(function (settings) {
                $rootScope.app_settings = settings;
                if (!settings || Object.keys(settings).length === 0) {
                    window.location = '#!/setup';
                } else if (settings.hasOwnProperty('isInstalled')) {
                    $scope.lockExtension();
                }
            });

        }]);
}());

