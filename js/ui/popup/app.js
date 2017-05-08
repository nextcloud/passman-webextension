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
     * @ngdoc overview
     * @name passmanApp
     * @description
     * # passmanApp
     *
     * Main module of the application.
     */
    angular
        .module('passmanExtension', [
            'ngResource',
            'ngRoute',
            'ngSanitize',
            'pascalprecht.translate',
            'angular-steps'
        ])
        .config(function ($routeProvider, $locationProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'views/list.html',
                    controller: 'ListCtrl'
                })
                .when('/search', {
                    templateUrl: 'views/search.html',
                    controller: 'SearchCtrl'
                })
                .when('/settings', {
                    templateUrl: 'views/settings.html',
                    controller: 'SettingsCtrl'
                })
                .when('/edit/:guid', {
                    templateUrl: 'views/edit_credential.html',
                    controller: 'EditCtrl'
                })
                .when('/locked', {
                    templateUrl: 'views/password_prompt.html',
                    controller: 'PasswordPromptCtrl'
                })
                .when('/setup', {
                    templateUrl: 'views/setup.html',
                    controller: 'SetupCtrl'
                })
                .otherwise({
                    redirectTo: '/'
                });
            $locationProvider.hashPrefix('!');
        }).config(function ($translateProvider) {

        /*$translateProvider.useSanitizeValueStrategy('sanitize');
         $translateProvider.useUrlLoader(OC.generateUrl('/apps/passman/api/v2/language'));
         $translateProvider.preferredLanguage('en');*/
    }).config(function ($httpProvider) {
        $httpProvider.useApplyAsync(true);
    }).config( [
        '$compileProvider',
        function( $compileProvider )
        {
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|moz-extension):/);
            // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
        }
    ]);

}());
