var StepperCtrl = (function () {
    function StepperCtrl($mdComponentRegistry, $attrs, $log) {
        this.$mdComponentRegistry = $mdComponentRegistry;
        this.$attrs = $attrs;
        this.$log = $log;
        this.labelStep = 'Step';
        this.labelOf = 'of';
        /* End of bindings */
        this.steps = [];
        this.currentStep = 0;
    }
    StepperCtrl.prototype.$onInit = function () {
        if (this.$attrs.mdMobileStepText === '') {
            this.mobileStepText = true;
        }
        if (this.$attrs.mdLinear === '') {
            this.linear = true;
        }
        if (this.$attrs.mdAlternative === '') {
            this.alternative = true;
        }
    };
    StepperCtrl.prototype.$postLink = function () {
        if (!this.$attrs.id) {
            this.$log.warn('You must set an id attribute to your stepper');
        }
        this.registeredStepper = this.$mdComponentRegistry.register(this, this.$attrs.id);
    };
    StepperCtrl.prototype.$onDestroy = function () {
        this.registeredStepper && this.registeredStepper();
    };
    /**
     * Register component step to this stepper.
     *
     * @param {StepCtrl} step The step to add.
     * @returns number - The step number.
     */
    StepperCtrl.prototype.$addStep = function (step) {
        return this.steps.push(step) - 1;
    };
    /**
     * Complete the current step and move one to the next.
     * Using this method on editable steps (in linear stepper)
     * it will search by the next step without "completed" state to move.
     * When invoked it dispatch the event onstepcomplete to the step element.
     *
     * @returns boolean - True if move and false if not move (e.g. On the last step)
     */
    StepperCtrl.prototype.next = function () {
        if (this.currentStep < this.steps.length) {
            this.clearError();
            this.currentStep++;
            this.clearFeedback();
            return true;
        }
        return false;
    };
    /**
     * Move to the previous step without change the state of current step.
     * Using this method in linear stepper it will check if previous step is editable to move.
     *
     * @returns boolean - True if move and false if not move (e.g. On the first step)
     */
    StepperCtrl.prototype.back = function () {
        if (this.currentStep > 0) {
            this.clearError();
            this.currentStep--;
            this.clearFeedback();
            return true;
        }
        return false;
    };
    /**
     * Move to the next step without change the state of current step.
     * This method works only in optional steps.
     *
     * @returns boolean - True if move and false if not move (e.g. On non-optional step)
     */
    StepperCtrl.prototype.skip = function () {
        var step = this.steps[this.currentStep];
        if (step.optional) {
            this.currentStep++;
            this.clearFeedback();
            return true;
        }
        return false;
    };
    /**
     * Defines the current step state to "error" and shows the message parameter on
     * title message element.When invoked it dispatch the event onsteperror to the step element.
     *
     * @param {string} message The error message
     */
    StepperCtrl.prototype.error = function (message) {
        var step = this.steps[this.currentStep];
        step.hasError = true;
        step.message = message;
        this.clearFeedback();
    };
    /**
     * Defines the current step state to "normal" and removes the message parameter on
     * title message element.
     */
    StepperCtrl.prototype.clearError = function () {
        var step = this.steps[this.currentStep];
        step.hasError = false;
    };
    /**
     * Move "active" to specified step id parameter.
     * The id used as reference is the integer number shown on the label of each step (e.g. 2).
     *
     * @param {number} stepNumber (description)
     * @returns boolean - True if move and false if not move (e.g. On id not found)
     */
    StepperCtrl.prototype.goto = function (stepNumber) {
        if (stepNumber < this.steps.length) {
            this.currentStep = stepNumber;
            this.clearFeedback();
            return true;
        }
        return false;
    };
    /**
     * Shows a feedback message and a loading indicador.
     *
     * @param {string} [message] The feedbackMessage
     */
    StepperCtrl.prototype.showFeedback = function (message) {
        this.hasFeedback = true;
        this.feedbackMessage = message;
    };
    /**
     * Removes the feedback.
     */
    StepperCtrl.prototype.clearFeedback = function () {
        this.hasFeedback = false;
    };
    StepperCtrl.prototype.isCompleted = function (stepNumber) {
        return this.linear && stepNumber < this.currentStep;
    };
    ;
    StepperCtrl.prototype.isActiveStep = function (step) {
        return this.steps.indexOf(step) === this.currentStep;
    };
    StepperCtrl.$inject = [
        '$mdComponentRegistry',
        '$attrs',
        '$log'
    ];
    return StepperCtrl;
}());
var StepperServiceFactory = ['$mdComponentRegistry',
    function ($mdComponentRegistry) {
        return function (handle) {
            var instance = $mdComponentRegistry.get(handle);
            if (!instance) {
                $mdComponentRegistry.notFoundError(handle);
            }
            return instance;
        };
    }];
var StepCtrl = (function () {
    /**
     *
     */
    function StepCtrl($element, $compile, $scope) {
        this.$element = $element;
        this.$compile = $compile;
        this.$scope = $scope;
    }
    StepCtrl.prototype.$postLink = function () {
        this.stepNumber = this.$stepper.$addStep(this);
    };
    StepCtrl.prototype.isActive = function () {
        var state = this.$stepper.isActiveStep(this);
        return state;
    };
    StepCtrl.$inject = [
        '$element',
        '$compile',
        '$scope'
    ];
    return StepCtrl;
}());
angular.module('mdSteppers', ['ngMaterial'])
    .factory('$mdStepper', StepperServiceFactory)
    .directive('mdStepper', function () {
        return {
            transclude: true,
            scope: {
                linear: '<?mdLinear',
                alternative: '<?mdAlternative',
                vertical: '<?mdVertical',
                mobileStepText: '<?mdMobileStepText',
                labelStep: '@?mdLabelStep',
                labelOf: '@?mdLabelOf'
            },
            bindToController: true,
            controller: StepperCtrl,
            controllerAs: 'stepper',
            templateUrl: 'mdSteppers/mdStepper.tpl.html'
        };
    })
    .directive('mdStep', ['$compile', function ($compile) {
        return {
            require: '^^mdStepper',
            transclude: true,
            scope: {
                label: '@mdLabel',
                optional: '@?mdOptional'
            },
            bindToController: true,
            controller: StepCtrl,
            controllerAs: '$ctrl',
            link: function (scope, iElement, iAttrs, stepperCtrl) {
                function addOverlay() {
                    var hasOverlay = !!iElement.find('.md-step-body-overlay')[0];
                    if (!hasOverlay) {
                        var overlay = angular.element("<div class=\"md-step-body-overlay\"></div>\n                            <div class=\"md-step-body-loading\">\n                                <md-progress-circular md-mode=\"indeterminate\"></md-progress-circular>\n                            </div>");
                        $compile(overlay)(scope);
                        iElement.find('.md-steppers-scope').append(overlay);
                    }
                }
                scope.$ctrl.$stepper = stepperCtrl;
                scope.$watch(function () {
                    return scope.$ctrl.isActive();
                }, function (isActive) {
                    if (isActive) {
                        iElement.addClass('md-active');
                        addOverlay();
                    }
                    else {
                        iElement.removeClass('md-active');
                    }
                });
            },
            templateUrl: 'mdSteppers/mdStep.tpl.html'
        };
    }])
    .config(['$mdIconProvider', function ($mdIconProvider) {
        $mdIconProvider.icon('steppers-check', 'mdSteppers/ic_check_24px.svg');
        $mdIconProvider.icon('steppers-warning', 'mdSteppers/ic_warning_24px.svg');
    }])
    .run(["$templateCache", function ($templateCache) {
        $templateCache.put("mdSteppers/ic_check_24px.svg", "<svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\">\r\n    <path d=\"M0 0h24v24H0z\" fill=\"none\"/>\r\n    <path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\"/>\r\n</svg>");
        $templateCache.put("mdSteppers/ic_warning_24px.svg", "<svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\">\r\n    <path d=\"M0 0h24v24H0z\" fill=\"none\"/>\r\n    <path d=\"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\"/>\r\n</svg>");
    }]);

angular.module("mdSteppers").run(["$templateCache", function($templateCache) {$templateCache.put("mdSteppers/mdStep.tpl.html","<div class=\"md-stepper\" ng-class=\"{ \'md-active\': $ctrl.isActive() }\">\r\n    <md-steppers-header class=\"md-steppers-header md-steppers-vertical\">\r\n        <button class=\"md-stepper-indicator\" ng-class=\"{\r\n                    \'md-active\': $ctrl.stepNumber === $ctrl.$stepper.currentStep,\r\n                    \'md-completed\': $ctrl.$stepper.isCompleted($ctrl.stepNumber),\r\n                    \'md-error\': $ctrl.hasError,\r\n                    \'md-stepper-optional\': $ctrl.optional || $ctrl.hasError\r\n                }\" ng-click=\"$ctrl.$stepper.goto($ctrl.stepNumber)\" ng-disabled=\"$ctrl.$stepper.linear || $ctrl.stepNumber === $ctrl.$stepper.currentStep\">\r\n                <div class=\"md-stepper-indicator-wrapper\">\r\n                    <div class=\"md-stepper-number\" ng-hide=\"$ctrl.hasError\">\r\n                    <span ng-if=\"!$ctrl.$stepper.isCompleted($ctrl.stepNumber)\">{{ ::$ctrl.stepNumber+1 }}</span>\r\n                        <md-icon md-svg-icon=\"steppers-check\" class=\"md-stepper-icon\" ng-if=\"$ctrl.$stepper.isCompleted($ctrl.stepNumber)\"></md-icon>\r\n                    </div>\r\n                    <div class=\"md-stepper-error-indicator\" ng-show=\"$ctrl.hasError\">\r\n                        <md-icon md-svg-icon=\"steppers-warning\"></md-icon>\r\n                    </div>\r\n\r\n                    <div class=\"md-stepper-title\">\r\n                        <span>{{ $ctrl.label }}</span>\r\n                        <small ng-if=\"$ctrl.optional && !$ctrl.hasError\">{{ $ctrl.optional }}</small>\r\n                        <small class=\"md-stepper-error-message\" ng-show=\"$ctrl.hasError\">\r\n                            {{ $ctrl.message }}\r\n                        </small>\r\n                    </div>\r\n                </div>\r\n                </button>\r\n        <div class=\"md-stepper-feedback-message\" ng-show=\"stepper.hasFeedback\">\r\n            {{stepper.feedbackMessage}}\r\n        </div>\r\n    </md-steppers-header>\r\n    <md-steppers-scope layout=\"column\" class=\"md-steppers-scope\" ng-if=\"$ctrl.isActive()\" ng-transclude></md-steppers-scope>\r\n</div>");
    $templateCache.put("mdSteppers/mdStepper.tpl.html","<div flex class=\"md-steppers\" ng-class=\"{ \r\n    \'md-steppers-linear\': stepper.linear, \r\n    \'md-steppers-alternative\': stepper.alternative,\r\n    \'md-steppers-vertical\': stepper.vertical,\r\n    \'md-steppers-mobile-step-text\': stepper.mobileStepText,\r\n    \'md-steppers-has-feedback\': stepper.hasFeedback\r\n    }\">\r\n    <div class=\"md-steppers-header-region\">\r\n        <md-steppers-header class=\"md-steppers-header md-steppers-horizontal md-whiteframe-1dp\">\r\n            <button class=\"md-stepper-indicator\" ng-repeat=\"(stepNumber, $step) in stepper.steps track by $index\" ng-class=\"{\r\n                \'md-active\': stepNumber === stepper.currentStep,\r\n                \'md-completed\': stepper.isCompleted(stepNumber),\r\n                \'md-error\': $step.hasError,\r\n                \'md-stepper-optional\': $step.optional || $step.hasError\r\n            }\" ng-click=\"stepper.goto(stepNumber)\" ng-disabled=\"stepper.linear || stepNumber === stepper.currentStep\">\r\n            <div class=\"md-stepper-indicator-wrapper\">\r\n                <div class=\"md-stepper-number\" ng-hide=\"$step.hasError\">\r\n                    <span ng-if=\"!stepper.isCompleted(stepNumber)\">{{ ::stepNumber+1 }}</span>\r\n                    <md-icon md-svg-icon=\"steppers-check\" class=\"md-stepper-icon\" ng-if=\"stepper.isCompleted(stepNumber)\"></md-icon>\r\n                </div>\r\n\r\n                <div class=\"md-stepper-error-indicator\" ng-show=\"$step.hasError\">\r\n                <md-icon md-svg-icon=\"steppers-warning\"></md-icon>\r\n                </div>\r\n                <div class=\"md-stepper-title\">\r\n                    <span>{{ $step.label }}</span>\r\n                    <small ng-if=\"$step.optional && !$step.hasError\">{{ $step.optional }}</small>\r\n                    <small class=\"md-stepper-error-message\" ng-show=\"$step.hasError\">\r\n                        {{ $step.message }}\r\n                    </small>\r\n                </div>\r\n            </div>\r\n            </button>\r\n           \r\n        </md-steppers-header>\r\n        <md-steppers-mobile-header class=\"md-steppers-mobile-header\">\r\n            <md-toolbar flex=\"none\" class=\"md-whiteframe-1dp\" style=\"background: #f6f6f6 !important; color: #202020 !important;\">\r\n                <div class=\"md-toolbar-tools\">\r\n                    <h3>\r\n                        <span>{{stepper.labelStep}} {{stepper.currentStep+1}} {{stepper.labelOf}} {{stepper.steps.length}}</span>\r\n                    </h3>\r\n                </div>\r\n            </md-toolbar>\r\n        </md-steppers-mobile-header>\r\n        <div class=\"md-stepper-feedback-message\" ng-show=\"stepper.hasFeedback\">\r\n            {{stepper.feedbackMessage}}\r\n        </div>\r\n    </div>\r\n    <md-steppers-content class=\"md-steppers-content\" ng-transclude></md-steppers-content>\r\n    <div class=\"md-steppers-overlay\"></div>\r\n</div>");}]);