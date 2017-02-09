(function () {
    'use strict';

    /**
     * @ngdoc function
     * @name passmanApp.controller:MainCtrl
     * @description
     * # MainCtrl
     * Controller of the passmanApp
     */
    angular.module('passmanExtension').directive('ngDebounce', function ($timeout) {
        return {
            restrict: 'A',
            require: 'ngModel',
            priority: 99,
            link: function (scope, elm, attr, ngModelCtrl) {
                if (attr.type === 'radio' || attr.type === 'checkbox') {
                    return;
                }

                var delay = parseInt(attr.ngDebounce, 10);
                if (isNaN(delay)) {
                    delay = 1000;
                }

                elm.unbind('input');

                var debounce;
                elm.bind('input', function () {
                    $timeout.cancel(debounce);
                    debounce = $timeout(function () {
                        scope.$apply(function () {
                            ngModelCtrl.$setViewValue(elm.val());
                        });
                    }, delay);
                });
                elm.bind('blur', function () {
                    scope.$apply(function () {
                        ngModelCtrl.$setViewValue(elm.val());
                    });
                });
            }
        };
    });;
}());

