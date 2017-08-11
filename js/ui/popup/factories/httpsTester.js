(function () {
    'use strict';

    /**
     * @ngdoc function
     * @name passmanApp.controller:MainCtrl
     * @description
     * # MainCtrl
     * Controller of the passmanApp
     */
    angular.module('passmanExtension').factory('HttpsTest', ['$http', '$q', function ($http, $q) {
        var tester = {};
        tester.test = function (url) {
            var deferred = $q.defer();
            if(url.match(/^https?/)){
                deferred.resolve(url);
                return deferred.promise;
            }
            // first test with https
            var protocol = 'https://';

            var req = {
                method: 'GET',
                url: protocol+url,
                timeout: 500
            };

            $http(req).then(function () {
                    // we have https
                    deferred.resolve(protocol + url);
                },
                function () {
                    protocol = 'http://';
                    // we don't have https
                    deferred.reject(protocol + url);
                });
            return deferred.promise;
        };

        tester.isHTTP = function (url) {
            return url.substr(0,5) == 'http:'
        };

        return tester;
    }]);
}());
