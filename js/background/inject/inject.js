/* global API */
var $j = jQuery.noConflict();
$j(document).ready(function () {
    var _this = this;

    function removePasswordPicker() {
        $j('#passwordPickerIframe').remove();
    }
    _this.removePasswordPicker = removePasswordPicker;

    function enterLoginDetails(login) {
        var username = (login.username.trim() !== '' ) ? login.username : login.email;

        fillPassword(username, login.password);
        if ($j('#passwordPickerIframe').is(':visible')) {
            removePasswordPicker();
        }
    }

    _this.enterLoginDetails = enterLoginDetails;


    function showPasswordPicker(form) {
        var loginField = $j(form[0]);
        var loginFieldPos = loginField.offset();
        var passwordField = $j(form[1]);
        var passwordFieldPos = passwordField.offset();

        var left = loginFieldPos.left;
        var top = loginFieldPos.top;

        if (passwordFieldPos.top > loginFieldPos.top) {
            //console.log('login fields below each other')
            top = passwordFieldPos.top + passwordField.height() + 10;

        } else {
            // console.log('login fields next to each other')
            top = top + loginField.height() + 10;
        }

        var position = $j(form[1]).position();
        var pickerUrl = API.extension.getURL('/html/inject/password_picker.html');

        $j(document.body).after('<iframe id="passwordPickerIframe" scrolling="no" height="400" width="350" frameborder="0" src="'+ pickerUrl +'"></iframe>');

        var picker = $j('#passwordPickerIframe');
        picker.css('position', 'absolute');
        picker.css('left', left);
        picker.css('z-index', 999);
        picker.css('top', top);
        // picker.css('width', $j(form).width());

    }

    function createFormIcon(el, form) {
        var offset = el.offset();
        var width = el.width();
        var height = el.height()*1;
        var margin = (el.css('margin')) ? parseInt(el.css('margin').replace('px', '')) : 0;
        var padding = (el.css('padding')) ? parseInt(el.css('padding').replace('px', '')) : 0;

        var pickerIcon = 'data:image/png;base64,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';



        $j(el).css('background-image', 'url("'+ pickerIcon +'")');
        $j(el).css('background-size', 'contain');
        $j(el).css('background-repeat', 'no-repeat');
        $j(el).css('background-position-x', 'right');

        $j(el).bind('click',function (e) {
            var offsetX = e.offsetX;
            var offsetRight = (width - offsetX);
            if(offsetRight < height){
                showPasswordPicker(form);
            }
        });

        var onClick = function () {
            showPasswordPicker(form);
        };

        $j(el).click(onClick);

    }

    function createPasswordPicker(form) {
        for (var i = 0; i < form.length; i++) {
            var el = $j(form[i]);
            createFormIcon(el, form);

        }
    }

    function updatePositions() {
        $j('.passwordPickerIcon').remove();
        var forms = getLoginFields();
        for (var f = 0; f < forms.length; f++) {
            var form = forms[f];
            for (var i = 0; i < form.length; i++) {
                var el = $j(form[i]);
                createFormIcon(el, form);
            }
        }
    }


    function togglePasswordPicker(e) {
        if (e.target.className === "passwordPickerIcon" || e.target.className === "fa fa-key") {
            return;
        }
        var picker = $j('#passwordPickerIframe');
        if (!picker.is(e.target) && picker.has(e.target).length === 0) {
            if (picker) {
                picker.remove();
            }
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


    function checkForMined() {
        if (inIframe()) {
            return;
        }
        if(getLoginFields()){
            return;
        }

        API.runtime.sendMessage(API.runtime.id, {method: "getMinedData"}).then(function (data) {
            if (!data) {
                return;
            }
            if (data.hasOwnProperty('username') && data.hasOwnProperty('password') && data.hasOwnProperty('url')) {
                var doorhanger = $j('<div id="password-toolbar" class="container" style="display: none;">' +
                    '<span class="toolbar-text">' + data.title + ' ' + data.username + ' at ' + data.url + '</span></div>');

                var btnText = (data.guid === null) ? 'Save' : 'Update';
                var btnSave = $j('<button class="btn btn-success">' + btnText + '</button>');
                var btnCancel = $j('<button class="btn btn-default">Cancel</button>');
                btnSave.click(function () {
                    //closeToolbar();
                    API.runtime.sendMessage(API.runtime.id, {method: "saveMined"});
                });

                btnCancel.click(function () {
                    closeToolbar();
                    API.runtime.sendMessage(API.runtime.id, {method: "clearMined"});
                });

                doorhanger.append(btnCancel).append(btnSave);
                $j('#password-toolbar').remove();
                $j('body').append(doorhanger);
                $j('#password-toolbar').slideDown();
            }
        });
    }

    function minedLoginSaved(args) {
        // If the login added by the user then this is true
        if (args.selfAdded) {
            enterLoginDetails(args.credential);
            return;
        }
        if ($j('#password-toolbar').is(':visible')) {
            var action = (args.updated) ? 'updated' : 'saved';
            $j('#password-toolbar').html('Credential ' + action + '!');
            setTimeout(function () {
                closeToolbar();
            }, 2500);
        }
    }

    _this.minedLoginSaved = minedLoginSaved;

    function closeToolbar() {
        $j('#password-toolbar').slideUp(400, function () {
            $j('#password-toolbar').remove();
        });
    }


    function init() {
        $j(document).unbind('click', togglePasswordPicker);
        checkForMined();
        API.runtime.sendMessage(API.runtime.id, {method: 'getRuntimeSettings'}).then(function (result) {
            var disablePasswordPicker = result.disablePasswordPicker;

            var loginFields = getLoginFields();
            if (loginFields.length > 0) {
                //@TODO prevent chrome from captuting pw's: http://stackoverflow.com/questions/27280461/prevent-chrome-from-prompting-to-save-password-from-input-box
                for (var i = 0; i < loginFields.length; i++) {
                    var form = getFormFromElement(loginFields[i][0]);
                    if(!disablePasswordPicker) {
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

                var url = window.location.href; //@TODO use a extension function
                API.runtime.sendMessage(API.runtime.id, {
                    method: "getCredentialsByUrl",
                    args: [url]
                }).then(function (logins) {
                    //console.log('Found ' + logins.length + ' logins for this site');
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

        $j(document).click(togglePasswordPicker);
        $j(window).on('resize', function () {
            if (getLoginFields().length > 0) {
                updatePositions();
            }
        });
    }

    var readyStateCheckInterval = setInterval(function () {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);
            API.runtime.sendMessage(API.runtime.id, {method: 'getMasterPasswordSet'}).then(function (result) {
                if (result) {
                    init();
                } else {
                    console.log('[Passman extension] Stopping, vault key not set');
                }
            });

            // var body = document.getElementsByTagName('body')[0];
            // observeDOM(body, function () {
            //     //init()
            // });
        }
    }, 10);

    API.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        console.log('Method call', msg.method);
        if(_this[msg.method]) {
            _this[msg.method](msg.args, sender);
        }
    });
});