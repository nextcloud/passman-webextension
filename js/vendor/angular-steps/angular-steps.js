(function () {

    angular.module('templates-angular-steps', ['step.html', 'steps.html']);

    angular.module('step.html', []).run(function ($templateCache) {
        $templateCache.put('step.html', '<div ng-show=\"selected\" class=\"step ng-hide\" ng-transclude></div>');
    });

    angular.module('steps.html', []).run(function ($templateCache) {
        $templateCache.put('steps.html',
            '<div class=\"angular-steps\">\n' +
            '    <div class=\"steps\" ng-transclude></div>\n' +
            '</div>');
    });

    angular.module('angular-steps', ['templates-angular-steps']);

    angular.module('angular-steps').directive('step', function () {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                name: '@'
            },
            require: '^steps',
            templateUrl: function (element, attributes) {
                return attributes.template || 'step.html';
            },
            link: function ($scope, $element, $attrs, steps) {
                steps.addStep($scope);
            }
        };
    });

    angular.module('angular-steps').directive('steps', function () {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                currentStep: '=',
                onFinish: '&',
                name: '@'
            },
            templateUrl: function (element, attributes) {
                return attributes.template || 'steps.html';
            },
            controller: function ($scope, $element, StepsService) {
                StepsService.addSteps($scope.name || StepsService.defaultName, this);

                $scope.$on('$destroy', function () {
                    StepsService.removeSteps($scope.name || StepsService.defaultName);
                });

                this.steps = $scope.steps = [];

                $scope.$watch('currentStep', function (step) {
                    if (!step) return;
                    var stepName = $scope.selectedStep.name;
                    if ($scope.selectedStep && stepName !== $scope.currentStep) {
                        var found = $scope.steps.filter(function (elm) {
                            return elm.name === $scope.currentStep;
                        })[0];
                        $scope.goTo(found);
                    }
                });

                this.addStep = function (step) {
                    $scope.steps.push(step);
                    if ($scope.steps.length === 1) {
                        $scope.goTo($scope.steps[0]);
                    }
                };

                $scope.goTo = function (step) {
                    unselectAll();
                    $scope.selectedStep = step;
                    if ($scope.currentStep !== void 0) {
                        $scope.currentStep = step.name;
                    }
                    step.selected = true;
                };

                function unselectAll() {
                    $scope.steps.forEach(function (step) {
                        step.selected = false;
                    });
                    $scope.selectedStep = null;
                }

                this.next = function () {
                    var index = $scope.steps.indexOf($scope.selectedStep);
                    if (index === $scope.steps.length - 1) {
                        this.finish();
                    } else {
                        $scope.goTo($scope.steps[index + 1]);
                    }
                };

                this.previous = function () {
                    var index = $scope.steps.indexOf($scope.selectedStep);
                    if (index === 0) {
                        throw new Error('Already at step 0');
                    } else {
                        $scope.goTo($scope.steps[index - 1]);
                    }
                };

                this.goTo = function (step) {
                    var stepTo;
                    if (isNaN(step)) {
                        stepTo = $scope.steps.filter(function (elm) {
                            return elm.name === step;
                        })[0];
                    } else {
                        stepTo = $scope.steps[step];
                    }
                    $scope.goTo(stepTo);
                };
                
                this.getCurrent = function() {
                    var index = $scope.steps.indexOf($scope.selectedStep);
                    
                    return $scope.steps[index];
                };

                this.finish = function () {
                    if ($scope.onFinish) {
                        $scope.onFinish();
                    }
                };

                this.cancel = function () {
                    $scope.goTo($scope.steps[0]);
                };
            }
        };
    });

    function stepsButtonDirective(action) {
        angular.module('angular-steps')
            .directive(action, function () {
                return {
                    restrict: 'A',
                    replace: false,
                    require: '^steps',
                    link: function ($scope, $element, $attrs, steps) {
                        $element.on('click', function (e) {
                            e.preventDefault();
                            $element.addClass(action);
                            $scope.$apply(function () {
                                $scope.$eval($attrs[action]);
                                steps[action.replace('step', '').toLowerCase()]();
                            });
                        });
                    }
                };
            });
    }

    stepsButtonDirective('stepNext');
    stepsButtonDirective('stepPrevious');
    stepsButtonDirective('stepFinish');
    stepsButtonDirective('stepCancel');

    angular.module('angular-steps').factory('StepsService', function () {
        var service = {};

        var instances = {};

        service.defaultName = 'default';

        service.addSteps = function (name, steps) {
            instances[name] = steps;
        };

        service.removeSteps = function (name) {
            delete instances[name];
        };

        service.steps = function (name) {
            return instances[name || service.defaultName];
        };
        
        service.getCurrent = function() {
            return instances[service.defaultName].getCurrent();
        };

        return service;
    });

})();