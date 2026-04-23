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
        .controller('SearchCtrl', ['$scope', function ($scope) {
            $scope.found_credentials = false;
            $scope.searchText = '';
            $scope.isLocked = false;

            // Check if extension is locked before any operation
            API.runtime.sendMessage(API.runtime.id, {
                'method': 'getVaultSettings'
            }).then(function (settings) {
                if (!settings || !settings.unlocked) {
                    $scope.isLocked = true;
                    window.location = '#!/locked';
                    $scope.$apply();
                }
            }).catch(function () {
                $scope.isLocked = true;
                window.location = '#!/locked';
            });

            $scope.search = function () {
                if ($scope.isLocked) {
                    window.location = '#!/locked';
                    return;
                }
                API.runtime.sendMessage(API.runtime.id, {
                    'method': 'searchCredential',
                    args: $scope.searchText
                }).then(function (result) {
                    $scope.found_credentials = result;
                    $scope.$apply();
                });
            };

            $scope.editCredential = function (credential) {
                window.location = '#!/edit/' + credential.guid;
            };

        }]);
}());

