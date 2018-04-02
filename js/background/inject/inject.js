/* global API */
var $j = jQuery.noConflict();

$j(document).ready(function () {

    $j(document).click(function (event) {
        var passwordPickerRef = '.passwordPickerIframe';
        if (!$j(event.target).closest(passwordPickerRef).length) {
            if ($j(passwordPickerRef).is(":visible")) {
                removePasswordPicker();
            }
        }
    });

    var _this = this;
    Array.prototype.findUrl = function (match) {
        return this.filter(function (item) {
            var matchParse = processURL(match, false, false, true, false);
            return typeof item === 'string' && item.indexOf(matchParse) > -1;
        });
    };

    function removePasswordPicker() {
        activeForm = undefined;
        $j('.passwordPickerIframe').remove();
    }

    _this.removePasswordPicker = removePasswordPicker;

    function enterLoginDetails(login, allowSubmit) {
        var username;

        if (login.hasOwnProperty('username')) {
            username = (login.username !== '' ) ? login.username : login.email;
        }
        if (!username) {
            username = null;
        }

        fillPassword(username, login.password);

        if (activeForm) {
            API.runtime.sendMessage(API.runtime.id, {method: 'isAutoSubmitEnabled'}).then(function (isEnabled) {
                if (isEnabled && allowSubmit) {
                    submitLoginForm(username);
                }
            });
        }
    }

    _this.enterLoginDetails = enterLoginDetails;

    function enterCustomFields(login, settings) {
        var customFieldPattern = /^\#(.*)$/;
        var elementId;
        var element = false;

        /* parhaps wise to try / catch this as this is non essential and no reason to abort previous processing */
        try {
            /* do we have custom_fields for this entry */
            if (login.hasOwnProperty('custom_fields') && login.custom_fields.length) {
                /* yes we do, iterate over all the custom_fields values */
                for (var i = 0, len = login.custom_fields.length; i < len; i++) {
                    /* does this custom field label begin with a hash? */
                    if (customFieldPattern.test(login.custom_fields[i].label)) {
                        /* set variable elementid to whatever element we are trying to auto fill */
                        elementId = customFieldPattern.exec(login.custom_fields[i].label)[1];
                        enterCustomFieldElement(elementId, login.custom_fields[i].value);
                    }
                    else if ($j('label[for]:contains(' + login.custom_fields[i].label + ')').length) {
                        elementId = $j('label[for]:contains(' + login.custom_fields[i].label + ')').attr('for');
                        enterCustomFieldElement(elementId, login.custom_fields[i].value);
                    }
                }
            }
        }
        catch (e) {
            if (settings.debug) {
                console.log('While attempting to auto fill custom fields the following exception was thrown: ' + e);
            }
        }
    }

    function enterCustomFieldElement(elementId, value) {
        /* check to see if element id exist */
        if ($j('#' + elementId).length) {
            element = $j('#' + elementId);
        }
        else if ($j('input[name$="' + elementId + '"]').length) { /* maybe element name exist */
            element = $j('input[name$="' + elementId + '"]');
        }
        else { /* neither element id or name exist */
            element = false;
        }
        /* if we have an element and it is type text, number or password, lets auto fill it */
        if (element && (element[0].type === 'text' || element[0].type === 'number' || element[0].type === 'password')) {
            element.val(value);
        }
    }

    function submitLoginForm(username) {
        if (!activeForm) {
            // @TODO detect login form on the current page
            return;
        }

        var formEl = $j(activeForm).closest('form');
        var iframeUrl = API.extension.getURL('/html/inject/auto_login.html');
        $j('#loginPopupIframe').remove();
        var loginPopup = $j('<iframe class="loginPopupIframe" scrolling="no" frameborder="0" src="' + iframeUrl + '"></iframe>');
        var padding = parseInt($j(formEl).css('padding').replace('px', ''));
        var margin = parseInt($j(formEl).css('margin').replace('px', ''));
        var height = Math.round($j(formEl).height() + (padding * 2) + (margin * 2));
        var width = Math.round($j(formEl).width() + (padding * 2) + (margin * 2));
        loginPopup.attr('height', height);
        loginPopup.attr('width', width);
        loginPopup.css('position', 'absolute');
        loginPopup.css('z-index', getMaxZ() + 1);
        loginPopup.css('background-color', 'rgba(0, 0, 0, 0.73)');
        loginPopup.css('left', Math.floor($j(formEl).offset().left - padding - margin));
        loginPopup.css('top', Math.floor($j(formEl).offset().top - padding - margin));
        removePasswordPicker();
        $j(document.body).prepend(loginPopup);
        API.runtime.sendMessage(API.runtime.id, {'setIframeUsername': username}).then(function () {
            $j(formEl).submit();
            setTimeout(function () {
                loginPopup.remove();
            }, 2000);
        });
    }

    function getMaxZ() {
        return Math.max.apply(null,
            $j.map($j('body *'), function (e) {
                if ($j(e).css('position') !== 'static')
                    return parseInt($j(e).css('z-index')) || 1;
            }));
    }

    var activeForm;

    function showPasswordPicker(form) {
        var jPasswordPicker = $j('.passwordPickerIframe');
        if (jPasswordPicker.length > 1) {
            return;
        }
        var loginField = $j(form[0]);
        var loginFieldPos = loginField.offset();
        var loginFieldVisible = loginField.is(':visible');

        var position = $j(form[1]).position();
        var passwordField = $j(form[1]);
        var passwordFieldPos = passwordField.offset();
        var passwordFieldVisible = loginField.is(':visible');
        var left = (loginFieldPos) ? loginFieldPos.left : passwordFieldPos.left;
        var top = (loginFieldPos) ? loginFieldPos.top : passwordFieldPos.top;
        var maxZ = getMaxZ();

        if (loginFieldPos && passwordFieldPos.top > loginFieldPos.top) {
            //console.log('login fields below each other')
            top = passwordFieldPos.top + passwordField.height() + 10;
        } else {
            // console.log('login fields next to each other')
            if (loginFieldPos) {
                top = top + loginField.height() + 10;
            } else {
                top = top + passwordField.height() + 10;
            }
        }
        if (!loginFieldVisible) {
            left = passwordFieldPos.left;
        }

        var pickerUrl = API.extension.getURL('/html/inject/password_picker.html');

        var picker = $j('<iframe class="passwordPickerIframe" scrolling="no" height="385" width="350" frameborder="0" src="' + pickerUrl + '"></iframe>');
        picker.css('position', 'absolute');
        picker.css('left', left);
        picker.css('z-index', maxZ + 10);
        picker.css('top', top);
        $j('body').prepend($j(picker));
        activeForm = form;
        // picker.css('width', $j(form).width());
        $j('.passwordPickerIframe:not(:last)').remove();
    }

    function onFormIconClick(e) {
        e.preventDefault();
        e.stopPropagation();
        var offsetX = e.offsetX;
        var offsetRight = (e.data.width - offsetX);
        if (offsetRight < e.data.height) {
            showPasswordPicker(e.data.form);
        }
    }

    function createFormIcon(el, form) {
        var offset = el.offset();
        var width = el.width();
        var height = el.height() * 1;
        var margin = (el.css('margin')) ? parseInt(el.css('margin').replace('px', '')) : 0;
        var padding = (el.css('padding')) ? parseInt(el.css('padding').replace('px', '')) : 0;

        var pickerIcon = API.extension.getURL('/icons/icon.svg');
        $j(el).css('background-image', 'url("' + pickerIcon + '")');
        $j(el).css('background-repeat', 'no-repeat');
        //$j(el).css('background-position', '');
        $j(el).css('cssText', el.attr('style') + ' background-position: right 3px center !important;');

        $j(el).unbind('click', onFormIconClick);
        $j(el).click({width: width, height: height, form: form}, onFormIconClick);
    }

    function createPasswordPicker(form) {
        for (var i = 0; i < form.length; i++) {
            var el = $j(form[i]);
            createFormIcon(el, form);
        }
    }

    function formSubmitted(fields) {
        var user = fields[0].value;
        var pass = fields[1].value;
        var params = {
            username: user,
            password: pass
        };
        //Disable password mining
        //$j(fields[1]).attr('type', 'hidden');
        API.runtime.sendMessage(API.runtime.id, {method: "minedForm", args: params});

    }

    function inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function showDoorhanger(data) {
        if (inIframe()) {
            return;
        }
        data.data.currentLocation = window.location.href;
        API.runtime.sendMessage(API.runtime.id, {method: "setDoorhangerData", args: data});
        var pickerUrl = API.extension.getURL('/html/inject/doorhanger.html');

        var doorhanger = $j('<iframe id="password-toolbarIframe" style="display: none;" scrolling="no" height="60" width="100%" frameborder="0" src="' + pickerUrl + '"></iframe>');
        $j('#password-toolbarIframe').remove();
        doorhanger.css('z-index', getMaxZ() + 1);
        $j('body').prepend(doorhanger);
        $j('#password-toolbarIframe').fadeIn();
    }

    _this.showDoorhanger = showDoorhanger;

    function showUrlUpdateDoorhanger(data) {
        var buttons = ['cancel', 'updateUrl'];
        showDoorhanger({
            data: data.data,
            buttons: buttons
        });
    }

    _this.showUrlUpdateDoorhanger = showUrlUpdateDoorhanger;

    function checkForMined() {
        if (inIframe()) {
            return;
        }

        API.runtime.sendMessage(API.runtime.id, {method: "getMinedData"}).then(function (data) {
            if (!data) {
                return;
            }
            if (data.hasOwnProperty('username') && data.hasOwnProperty('password') && data.hasOwnProperty('url')) {
                var buttons = ['cancel', 'ignore', 'save'];
                showDoorhanger({data: data, buttons: buttons});
            }
        });
    }


    function closeDoorhanger() {
        $j('#password-toolbarIframe').hide(400);
        $j('#password-toolbarIframe').remove();
    }

    _this.closeDoorhanger = closeDoorhanger;

    var flagFilledForm = false;
    function initForms() {
        API.runtime.sendMessage(API.runtime.id, {method: 'getRuntimeSettings'}).then(function (settings) {
            var enablePasswordPicker = settings.enablePasswordPicker;
            var url = window.location.href;
            var loginFields = getLoginFields();
            if (!settings.hasOwnProperty('ignored_sites') || settings.ignored_sites.findUrl(url).length !== 0) {
                return;
            }

            if (loginFields.length > 0) {
                for (var i = 0; i < loginFields.length; i++) {
                    var form = getFormFromElement(loginFields[i][0]);
                    if (enablePasswordPicker) {
                        createPasswordPicker(loginFields[i], form);
                    }

                    //Password miner
                    /* jshint ignore:start */
                    $j(form).submit((function (loginFields) {
                        return function () {
                            formSubmitted(loginFields);
                        };
                    })(loginFields[i]));
                    /* jshint ignore:end */
                }

                API.runtime.sendMessage(API.runtime.id, {
                    method: "getCredentialsByUrl",
                    args: url
                }).then(function (logins) {
                    console.log('Found ' + logins.length + ' logins for this site');
                    if (logins.length === 1) {
                        API.runtime.sendMessage(API.runtime.id, {method: 'isAutoFillEnabled'}).then(function (isEnabled) {
                            if (isEnabled && !flagFilledForm) {
                                enterLoginDetails(logins[0], false);
                                flagFilledForm = true;
                            }
                        });
                    }
                });
            }

            API.runtime.sendMessage(API.runtime.id, {
                method: "getCredentialsByUrl",
                args: url
            }).then(function (logins) {
                if (logins.length === 1) {
                    API.runtime.sendMessage(API.runtime.id, {method: 'isAutoFillEnabled'}).then(function (isEnabled) {
                        if (isEnabled) {
                            enterCustomFields(logins[0], settings);
                        }
                    });
                }
            });

        });
    }

    function minedLoginSaved(args) {
        // If the login added by the user then this is true
        if (args.selfAdded) {
            showDoorhanger({
                data: args,
                buttons: ['cancel']
            });
            enterLoginDetails(args.credential, false);
        }
    }

    _this.minedLoginSaved = minedLoginSaved;

    function resizeIframe(height) {
        $j('#password-toolbarIframe').height(60 + height);
    }

    _this.resizeIframe = resizeIframe;

    function copyText(text) {
        var txtToCopy = document.createElement('input');
        txtToCopy.style.left = '-300px';
        txtToCopy.style.position = 'absolute';
        txtToCopy.value = text;
        document.body.appendChild(txtToCopy);
        txtToCopy.select();
        document.execCommand('copy');
        txtToCopy.parentNode.removeChild(txtToCopy);
    }

    _this.copyText = copyText;

    function init() {
        checkForMined();
        initForms();
    }

    var readyStateCheckInterval = setInterval(function () {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);
            API.runtime.sendMessage(API.runtime.id, {method: 'getMasterPasswordSet'}).then(function (result) {
                if (result) {
                    init();
                    var body = document.getElementsByTagName('body')[0];
                    if (body) {
                        observeDOM(body, initForms);
                    }
                } else {
                    console.log('[Passman extension] Stopping, vault key not set');
                }
            });
        }
    }, 10);

    API.runtime.onMessage.addListener(function (msg, sender) {
        //console.log('Method call', msg.method);
        if (_this[msg.method]) {
            _this[msg.method](msg.args, sender);
        }
    });
});
