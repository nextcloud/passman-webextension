/* global API */
var $j = jQuery.noConflict();
$j(document).ready(function () {
    var storage = new API.Storage();

    var password_picker_html = null;
    var _this = this;

    $j.ajax({
        url: API.extension.getURL('/html/inject/password_picker.html'),
        contentType: 'text',
        type: 'GET',
        success: function (data) {
            // Firefox parsed data as a XMLDoc, revert that
            if (typeof data === 'object') {
                data = '<div id="password_picker">' + data.documentElement.innerHTML + '</div>';
            }
            password_picker_html = $j(data);
        }
    });

    function removePasswordPicker() {
        $j('#password_picker').remove();
    }

    function copyTextToClipboard(text) {
        var copyFrom = document.createElement("textarea");
        copyFrom.textContent = text;
        var body = document.getElementsByTagName('body')[0];
        body.appendChild(copyFrom);
        copyFrom.select();
        document.execCommand('copy');
        body.removeChild(copyFrom);
    }
    _this.copyTextToClipboard = copyTextToClipboard;

    function enterLoginDetails(login) {
        var username = (login.username.trim() !== '' ) ? login.username : login.email;

        fillPassword(username, login.password);
        if ($j('#password_picker').is(':visible')) {
            removePasswordPicker();
        }
    }

    _this.enterLoginDetails = enterLoginDetails;
    function setupAddCredentialFields() {
        var labelfield = $j('#savepw-label');
        labelfield.val(document.title);
        var userfield = $j('#savepw-username');
        var pwfield = $j('#savepw-password');
        $j('.togglePw').click(function () {
            $j('.togglePw').toggleClass('fa-eye').toggleClass('fa-eye-slash');
            if (pwfield.attr('type') === 'password') {
                pwfield.attr('type', 'text');
            } else {
                pwfield.attr('type', 'password');
            }
        });

        $j('#savepw-save').click(function (e) {
            e.preventDefault();
            API.runtime.sendMessage(API.runtime.id, {
                method: "injectCreateCredential", args: {
                    label: labelfield.val(),
                    username: userfield.val(),
                    password: pwfield.val()
                }
            });
        });

        $j('#savepw-cancel').click(function () {
            labelfield.val(document.title);
            userfield.val('');
            pwfield.val('');
            removePasswordPicker();
        });

    }

    function toggleFieldType(field) {
        if ($j(field).attr('type').toLowerCase() === 'text') {
            $j(field).attr('type', 'password');
        } else {
            $j(field).attr('type', 'text');
        }
    }

    function genPwd(settings) {
        /* jshint ignore:start */
        var password = generatePassword(settings['length'],
            settings.useUppercase,
            settings.useLowercase,
            settings.useDigits,
            settings.useSpecialChars,
            settings.minimumDigitCount,
            settings.avoidAmbiguousCharacters,
            settings.requireEveryCharType);
        /* jshint ignore:end */
        return password;
    }

    function getPasswordGenerationSettings(cb) {
        var default_settings = {
            'length': 12,
            'useUppercase': true,
            'useLowercase': true,
            'useDigits': true,
            'useSpecialChars': true,
            'minimumDigitCount': 3,
            'avoidAmbiguousCharacters': false,
            'requireEveryCharType': true
        };
        storage.get('password_generator_settings').then(function (_settings) {
            if (!_settings) {
                _settings = default_settings;
            }

            cb(_settings);
        }).error(function () {
            cb(default_settings);
        });
    }

    function setupPasswordGenerator() {
        //getPasswordGeneratorSettings
        getPasswordGenerationSettings(function (settings) {
            var round = 0;

            function generate_pass() {
                var new_password = genPwd(settings);
                $j('#generated_password').val(new_password);
                setTimeout(function () {
                    if (round < 10) {
                        generate_pass();
                        round++;
                    } else {
                        round = 0;
                    }
                }, 10);
            }

            $j.each(settings, function (setting, val) {
                if (typeof(val) === "boolean") {
                    $j('[name="' + setting + '"]').prop('checked', val);
                } else {
                    $j('[name="' + setting + '"]').val(val);
                }
            });

            $j('form[name="advancedSettings"]').change(function () {
                var pw_settings_form = $j(this);
                settings = pw_settings_form.serializeObject();
                storage.set('password_generator_settings', settings);
            });

            $j('.renewpw').click(function () {
                generate_pass();
            });
            $j('.renewpw').click();

            $j('.usepwd').click(function () {
                $j('#savepw-password').val($j('#generated_password').val());
                $j('.tab.add').click();
            });

            $j('.togglePwVis').click(function () {
                toggleFieldType('#generated_password');
                $j(this).find('.fa').toggleClass('fa-eye-slash').toggleClass('fa-eye');
            });

            $j('.adv_opt').click(function () {

                var adv_settings = $j('.pw-setting-advanced');
                $j(this).find('i').toggleClass('fa-angle-right').toggleClass('fa-angle-down');
                if (adv_settings.is(':visible')) {
                    adv_settings.slideUp();
                } else {
                    adv_settings.slideDown();
                }
            });
        });
    }

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
        $j(document.body).after($j(password_picker_html));

        var picker = $j('#password_picker');
        picker.css('position', 'absolute');
        picker.css('left', left);
        picker.css('top', top);
        // picker.css('width', $j(form).width());
        picker.find('.tab').click(function () {
            var target = $j(this).attr('class').replace('active', '').replace('tab', '').trim();
            picker.find('.tab').removeClass('active');
            picker.find('.tab-content').children().hide();
            picker.find('.tab-' + target + '-content').show();
            picker.find('.tab.' + target).addClass('active');
        });

        $j('.tab.close').click(function () {
            picker.find('.tab-list-content').show();
            removePasswordPicker();
        });

        var url = window.location.href;
        API.runtime.sendMessage(API.runtime.id, {method: "getCredentialsByUrl", args: [url]}).then(function (logins) {
            if (logins.length !== 0) {
                picker.find('.tab-list-content').html('');
            }
            for (var i = 0; i < logins.length; i++) {
                var login = logins[i];
                var row = $j('<div class="account">' + login.label + '<br /><small>' + login.username + '</small></div>');
                /* jshint ignore:start */
                row.click((function (login) {
                    return function () {
                        enterLoginDetails(login);
                    };
                })(login));
                /* jshint ignore:end*/

                picker.find('.tab-list-content').append(row);
            }
        });
        $j('.no-credentials .save').on('click', function () {
            $j('.tab.add').click();
        });
        $j('.no-credentials .gen').on('click', function () {
            $j('.tab.generate').click();
        });
        setupAddCredentialFields();
        setupPasswordGenerator();
    }

    function createFormIcon(el, form) {
        var offset = el.offset();
        var width = el.width();
        var height = el.height();
        var margin = (el.css('margin')) ? parseInt(el.css('margin').replace('px', '')) : 0;
        var padding = (el.css('padding')) ? parseInt(el.css('padding').replace('px', '')) : 0;
        var paddingRight = parseInt(el.css('padding-right').replace('px', ''));
        var fontSize = el.css('font-size');
        var borderh = (el.css('border-height')) ? el.css('border-height') : '2px';
        var borderw = (el.css('border-width')) ? el.css('border-width') : '2px';
        var borderColor = el.css('border-color');
        var borderHeight = parseInt(borderh.replace('px', ''));
        var borderWidth = parseInt(borderw.replace('px', ''));
        var iconWidth = width * 0.1;
        var pickerButton = $j('<span class="passwordPickerIcon" style="display: inline-block"> </span>');
        $j('body').append(pickerButton);
        if (el.find('.passwordPickerIcon').length > 0) {
            pickerButton = el.find('.passwordPickerIcon')[0];
        }


        //pickerButton.css('background-image', 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAASCAYAAABSO15qAAAAAXNSR0IArs4c6QAAAPhJREFUOBHlU70KgzAQPlMhEvoQTg6OPoOjT+JWOnRqkUKHgqWP4OQbOPokTk6OTkVULNSLVc62oJmbIdzd95NcuGjX2/3YVI/Ts+t0WLE2ut5xsQ0O+90F6UxFjAI8qNcEGONia08e6MNONYwCS7EQAizLmtGUDEzTBNd1fxsYhjEBnHPQNG3KKTYV34F8ec/zwHEciOMYyrIE3/ehKAqIoggo9inGXKmFXwbyBkmSQJqmUNe15IRhCG3byphitm1/eUzDM4qR0TTNjEixGdAnSi3keS5vSk2UDKqqgizLqB4YzvassiKhGtZ/jDMtLOnHz7TE+yf8BaDZXA509yeBAAAAAElFTkSuQmCC")');
        pickerButton.css('background-image', 'url("data:image/png;base64,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")');
        pickerButton.css('background-repeat', 'no-repeat');
        pickerButton.css('background-attachment', 'scroll');
        //pickerButton.css('background-size', '16px 18px');
        pickerButton.css('background-size', 'contain');
        pickerButton.css('background-position', '98% 50%');
        pickerButton.css('cursor', 'pointer');
        pickerButton.css('text-align', 'center');
        pickerButton.css('box-sizing', 'content-box');
        pickerButton.css('position', 'absolute');
        /*
         pickerButton.css('background-color', 'rgb(234, 234, 234)');
         pickerButton.css('border-top-right-radius', el.css('border-top-right-radius'));
         pickerButton.css('border-bottom-right-radius', el.css('border-bottom-right-radius'));
         pickerButton.css('border-color', borderColor);*/

        pickerButton.css('z-index', '999');
        pickerButton.css('width', iconWidth);


        pickerButton.css('padding', padding);
        pickerButton.css('font-size', fontSize);
        pickerButton.css('height', height);
        pickerButton.css('margin', margin);
        pickerButton.css('font-weight', el.css('font-weight'));
        pickerButton.css('top', Math.round((offset.top + (height / 4) - margin / 2 - padding / 2 ) - (borderHeight / 2)) + 'px');
        pickerButton.css('left', Math.round((offset.left + width * 0.9) + paddingRight - padding + borderWidth) + 'px');


        var onClick = function () {
            showPasswordPicker(form);
        };

        //$j('body').append(pickerButton);

        pickerButton.find('fa-key').click(onClick);
        $j(pickerButton).click(onClick);

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
        var picker = $j('#password_picker');
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

        API.runtime.sendMessage(API.runtime.id, {method: "getMinedData"}).then(function (data) {
            if (!data) {
                return;
            }
            if (data.hasOwnProperty('username') && data.hasOwnProperty('password') && data.hasOwnProperty('url')) {
                var doorhanger = $j('<div id="password-toolbar" class="container" style="display: none;"><span class="toolbar-text">' + data.title + ' ' + data.username + ' at ' + data.url + '</span></div>');

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

    function insertFontCSS() {
        var fontPath = API.extension.getURL('');
        var fontCss = ["@font-face {",
            "font-family: 'FontAwesome';",
            "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?v=4.7.0');",
            "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?#iefix&v=4.7.0') format('embedded-opentype'), url('" + fontPath + "fonts/fontawesome-webfont.woff2?v=4.7.0') format('woff2'), url('" + fontPath + "fonts/fontawesome-webfont.woff?v=4.7.0') format('woff'), url('" + fontPath + "fonts/fontawesome-webfont.ttf?v=4.7.0') format('truetype'), url('" + fontPath + "fonts/fontawesome-webfont.svg?v=4.7.0#fontawesomeregular') format('svg');",
            "font-weight: normal;",
            "font-style: normal;",
            "}"];
        if (window.navigator.userAgent.indexOf('Firefox') !== -1) {
            fontCss[2] = "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?v=4.7.0');";
            fontCss[3] = "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?#iefix&v=4.7.0') format('embedded-opentype'), url('" + fontPath + "fonts/fontawesome-webfont.woff2?v=4.7.0') format('woff2'), url('" + fontPath + "fonts/fontawesome-webfont.woff?v=4.7.0') format('woff'), url('" + fontPath + "fonts/fontawesome-webfont.ttf?v=4.7.0') format('truetype'), url('" + fontPath + "fonts/fontawesome-webfont.svg?v=4.7.0#fontawesomeregular') format('svg');";
        }
        var css = fontCss.join('');
        var style = document.createElement('style'),
            head = document.head || document.getElementsByTagName('head')[0];

        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }

        head.appendChild(style);
    }


    function init() {
        insertFontCSS();
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

            var body = document.getElementsByTagName('body')[0];
            observeDOM(body, function () {
                //init()
            });
        }
    }, 10);

    API.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        _this[msg.method](msg.args, sender);
    });
});