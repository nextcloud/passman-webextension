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
        .controller('MainCtrl', ['$scope', 'Settings', '$location', '$rootScope', '$timeout', function ($scope, Settings, $window, $rootScope, $timeout) {


            $scope.menuIsOpen = false;
            $scope.bodyOverflow = false;
            $scope.toggleMenu = function () {
                console.log('click');
                $scope.menuIsOpen = !$scope.menuIsOpen;
                $scope.bodyOverflow = true;
                $timeout(function () {
                    $scope.bodyOverflow = false;
                }, 1500);
            };

            $scope.goto_settings = function () {
                window.location = '#!/settings';
            };

            $scope.goto_search = function () {
                window.location = '#!/search';
            };

            $scope.editCredential = function (credential) {
                window.location = '#!/edit/' + credential.guid;
            };
        }]);
}());

