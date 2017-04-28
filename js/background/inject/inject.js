/* global API */
var $j = jQuery.noConflict();

$j(document).ready(function () {
    var _this = this;
    Array.prototype.findUrl = function (match) {
        return this.filter(function (item) {
            return typeof item === 'string' && item.indexOf(match) > -1;
        });
    };

    function removePasswordPicker() {
        $j('.passwordPickerIframe').remove();
    }

    _this.removePasswordPicker = removePasswordPicker;

    function enterLoginDetails(login) {
        var username;

        if (login.hasOwnProperty('username')) {
            username = (login.username.trim() !== '' ) ? login.username : login.email;
        }

        fillPassword(username, login.password);
        if ($j('.passwordPickerIframe').is(':visible')) {
            removePasswordPicker();
        }
    }

    _this.enterLoginDetails = enterLoginDetails;


    function showPasswordPicker(form) {
        if ($j('.passwordPickerIframe').length > 1) {
            return;
        }
        var loginField = $j(form[0]);
        var loginFieldPos = loginField.offset();
        var position = $j(form[1]).position();
        var passwordField = $j(form[1]);
        var passwordFieldPos = passwordField.offset();

        var left = loginFieldPos.left;
        var top = loginFieldPos.top;
        var maxZ = Math.max.apply(null,
            $j.map($j('body *'), function (e) {
                if ($j(e).css('position') !== 'static')
                    return parseInt($j(e).css('z-index')) || 1;
            }));
        if (passwordFieldPos.top > loginFieldPos.top) {
            //console.log('login fields below each other')
            top = passwordFieldPos.top + passwordField.height() + 10;

        } else {
            // console.log('login fields next to each other')
            top = top + loginField.height() + 10;
        }


        var pickerUrl = API.extension.getURL('/html/inject/password_picker.html');

        var picker = $j('<iframe class="passwordPickerIframe" scrolling="no" height="400" width="350" frameborder="0" src="' + pickerUrl + '"></iframe>');
        picker.css('position', 'absolute');
        picker.css('left', left);
        picker.css('z-index', maxZ);
        picker.css('top', top);
        $j('body').append($j(picker));
        // picker.css('width', $j(form).width());
        $j('.passwordPickerIframe:not(:last)').remove();
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
        $j(el).css('background-position', 'right 3px center');


        function onClick(e) {
            e.preventDefault();
            var offsetX = e.offsetX;
            var offsetRight = (width - offsetX);
            if (offsetRight < height) {
                showPasswordPicker(form);
            }
        }

        // $j(el).bind('click', onClick);
        $j(el).click(onClick);

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

        var doorhanger = $j('<iframe id="password-toolbarIframe" style="display: none;" scrolling="no" height="80" width="100%" frameborder="0" src="' + pickerUrl + '"></iframe>');
        $j('#password-toolbarIframe').remove();
        $j('body').after(doorhanger);
        $j('#password-toolbarIframe').slideDown();
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
                var buttons = [ 'cancel', 'save', 'ignore'];
                showDoorhanger({data: data, buttons: buttons});
            }
        });
    }



    function closeDoorhanger() {
        $j('#password-toolbarIframe').slideUp(400, function () {
            $j('#password-toolbarIframe').remove();
        });
    }
    _this.closeDoorhanger = closeDoorhanger;

    function initForms() {
        API.runtime.sendMessage(API.runtime.id, {method: 'getRuntimeSettings'}).then(function (result) {
            var disablePasswordPicker = result.disablePasswordPicker;
            var url = window.location.href;
            var loginFields = getLoginFields();
            if (loginFields.length > 0) {
                for (var i = 0; i < loginFields.length; i++) {
                    var form = getFormFromElement(loginFields[i][0]);
                    if (!disablePasswordPicker) {
                        createPasswordPicker(loginFields[i], form);
                    }
                    //Password miner
                    /* jshint ignore:start */
                    if (!result.hasOwnProperty('ignored_sites') || result.ignored_sites.findUrl(url) !== -1) {
                        $j(form).submit((function (loginFields) {
                            return function () {
                                formSubmitted(loginFields);
                            };
                        })(loginFields[i]));
                    }
                    /* jshint ignore:end */
                }

                API.runtime.sendMessage(API.runtime.id, {
                    method: "getCredentialsByUrl",
                    args: url
                }).then(function (logins) {
                    console.log('Found ' + logins.length + ' logins for this site');
                    if (logins.length === 1) {
                        API.runtime.sendMessage(API.runtime.id, {method: 'isAutoFillEnabled'}).then(function (isEnabled) {
                            if (isEnabled) {
                                enterLoginDetails(logins[0]);
                            }
                        });
                    }

                });
            }

        });
    }

    function minedLoginSaved(args) {
        // If the login added by the user then this is true
        if (args.selfAdded) {
            enterLoginDetails(args.credential);
        }
    }
    _this.minedLoginSaved = minedLoginSaved;

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
                    // var body = document.getElementsByTagName('body')[0];
                    // observeDOM(body, function () {
                    //     initForms();
                    // });
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