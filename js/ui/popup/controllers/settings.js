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
        .controller('SettingsCtrl', ['$scope', 'notify', '$routeParams', function ($scope, notify, $routeParams) {
            $scope.settings = {
                accounts: [],
                ignoreProtocol: true,
                ignoreSubdomain: true,
                ignorePort: true,
                ignorePath: true,
                generatedPasswordLength: 12,
                remember_password: true,
                refreshTime: 60,
                debug: false
            };
            $scope.errors = [];

            $scope.tabActive =  ($routeParams.tab) ? parseInt($routeParams.tab) : 1;
            $scope.extension = API.runtime.getManifest().name + ' extension ' + API.runtime.getManifest().version;

            API.runtime.sendMessage(API.runtime.id, {'method': 'getRuntimeSettings'}).then(function (settings) {
                $scope.errors = [];
                if (settings) {
                    $scope.settings = angular.copy(settings);
                }
                $scope.$apply();
            });

            $scope.saving = false;
            $scope.saveSettings = function (redirect) {
                $scope.errors = [];
                var settings = angular.copy($scope.settings);
                $scope.saving = true;
                API.runtime.sendMessage(API.runtime.id, {method: "saveSettings", args: settings}).then(function () {
                    setTimeout(function () {
                        if(redirect) {
                            window.location = '#!/';
                        }
                        $scope.saving = false;
                    }, 750);
                });
            };

            $scope.removeSite = function (site) {
                var idx = $scope.settings.ignored_sites.indexOf(site);
                $scope.settings.ignored_sites.splice(idx, 1);
            };

            $scope.ignoreSite = '';
            $scope.addSite = function (site) {
                $scope.settings.ignored_sites.push(site);
                $scope.ignoreSite = '';
            };

            $scope.removeAccount = function (account) {
                var idx = $scope.settings.accounts.indexOf(account);
                $scope.settings.accounts.splice(idx, 1);
                $scope.saveSettings(false);
            };

            $scope.cancel = function () {
                window.location = '#!/';
            };
            $scope.addAccount = function () {
                window.location = '#!/accounts/add';
            };
        }]);
}());

