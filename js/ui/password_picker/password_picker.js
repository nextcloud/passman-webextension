$(document).ready(function () {
    var _this = this;
    var storage = new API.Storage();

    $('[t]').each(function () {
        var string = $(this).attr('t');
        var startChar = string[0];
        var endChar = string[string.length - 1];
        var attribute;
        if(startChar === '[' && endChar === ']'){
            var data = string.replace('[','').replace(']','').split(',');
            attribute = data[1].trim();
            string = data[0].trim();
        }
        var translated = API.i18n.getMessage(string);
        if(attribute){
            $(this).attr(attribute, translated);
        } else {
            $(this).text(translated);
        }
    });

    function fillLogin(login) {
        API.runtime.sendMessage(API.runtime.id, {
            method: 'passToParent',
            args: {
                injectMethod: 'enterLoginDetails',
                args: login
            }
        });
    }

    function removePasswordPicker(login) {
        API.runtime.sendMessage(API.runtime.id, {
            method: 'passToParent',
            args: {
                injectMethod: 'removePasswordPicker'
            }
        });
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


    function setupAddCredentialFields() {
        var labelfield = $('#savepw-label');
        labelfield.val(document.title);
        var userfield = $('#savepw-username');
        var pwfield = $('#savepw-password');
        $('.togglePw').click(function () {
            $('.togglePw').find('.fa').toggleClass('fa-eye').toggleClass('fa-eye-slash');
            if (pwfield.attr('type') === 'password') {
                pwfield.attr('type', 'text');
            } else {
                pwfield.attr('type', 'password');
            }
        });

        $('#savepw-save').click(function (e) {
            e.preventDefault();
            $(this).val('Saving...');
            $(this).attr('disabled', true);
            API.runtime.sendMessage(API.runtime.id, {
                method: "injectCreateCredential", args: {
                    label: labelfield.val(),
                    username: userfield.val(),
                    password: pwfield.val()
                }
            });
        });

        $('#savepw-cancel').click(function () {
            labelfield.val(document.title);
            userfield.val('');
            pwfield.val('');
            removePasswordPicker();
            //removePasswordPicker();
        });

    }

    function toggleFieldType(field) {
        if ($(field).attr('type').toLowerCase() === 'text') {
            $(field).attr('type', 'password');
        } else {
            $(field).attr('type', 'text');
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

            function generate_pass(inputId) {
                var new_password = genPwd(settings);
                $('#' + inputId).val(new_password);
                setTimeout(function () {
                    if (round < 10) {
                        generate_pass(inputId);
                        round++;
                    } else {
                        round = 0;
                    }
                }, 10);
            }

            $.each(settings, function (setting, val) {
                if (typeof(val) === "boolean") {
                    $('[name="' + setting + '"]').prop('checked', val);
                } else {
                    $('[name="' + setting + '"]').val(val);
                }
            });

            $('form[name="advancedSettings"]').change(function () {
                var pw_settings_form = $(this);
                settings = pw_settings_form.serializeObject();
                storage.set('password_generator_settings', settings);
            });

            $('.renewpw').click(function () {
                generate_pass('generated_password');
            });
            $('.renewpw_newac').click(function () {
                generate_pass('savepw-password');

            });
            $('.renewpw').click();
            $('.renewpw_newac').click();

            $('.usepwd').click(function () {
                $('#savepw-password').val($('#generated_password').val());
                $('.tab.add').click();
            });

            $('.togglePwVis').click(function () {
                toggleFieldType('#generated_password');
                $(this).find('.fa').toggleClass('fa-eye-slash').toggleClass('fa-eye');
            });

            $('.adv_opt').click(function () {

                var adv_settings = $('.pw-setting-advanced');
                $(this).find('i').toggleClass('fa-angle-right').toggleClass('fa-angle-down');
                if (adv_settings.is(':visible')) {
                    adv_settings.slideUp();
                } else {
                    adv_settings.slideDown();
                }
            });
        });
    }

    var picker = $('#password_picker');
    var makeTabActive = function (name) {
        picker.find('.tab').removeClass('active');
        picker.find('.tab-content').children().hide();
        picker.find('.tab-' + name + '-content').show();
        picker.find('.tab.' + name).addClass('active');
    };

    picker.find('.tab').click(function () {
        var name = $(this).attr('data-name');
        storage.set('activeTab', name).then(function (r) {
            makeTabActive(name);
        });

    });

    storage.get('activeTab').then(function (name) {
        if(name) {
            makeTabActive(name);
        } else {
            makeTabActive('list');
        }
    });

    $('.tab.close').click(function () {
        removePasswordPicker();
    });


    API.runtime.sendMessage(API.runtime.id, {method: "getActiveTab", args: {returnFn: "returnActiveTab"}});

    function returnActiveTab(tab) {
        API.runtime.sendMessage(API.runtime.id, {
            method: "getCredentialsByUrl",
            args: [tab.url]
        }).then(function (logins) {
            if(logins.length === 0){
                API.runtime.sendMessage(API.runtime.id, {
                    'method': 'getSetting',
                    args: 'no_results_found_tab'
                }).then(function (value) {
                    makeTabActive(value);
                });
                return;
            }
            if (logins.length !== 0) {
                picker.find('.tab-list-content').html('');
            }
            for (var i = 0; i < logins.length; i++) {
                var login = logins[i];
                var div = $('<div>', {class: 'account', text: login.label});
                $('<br>').appendTo(div);
                var username = (login.username.trim() !== '' ) ? login.username : login.email;
                $('<small>').text(username).appendTo(div);
                /* jshint ignore:start */
                div.click((function (login) {
                    return function () {
                        //enterLoginDetails(login);
                        //API.runtime.sendMessage(API.runtime.id, {method: 'getMasterPasswordSet'})
                        fillLogin(login)
                    };
                })(login));
                /* jshint ignore:end*/

                picker.find('.tab-list-content').append(div);
            }
        });
    }

    _this.returnActiveTab = returnActiveTab;


    $('.no-credentials .save').on('click', function () {
        $('.tab.add').click();
    });
    $('.no-credentials .search').on('click', function () {
        $('.tab.search').click();
    });
    $('.no-credentials .gen').on('click', function () {
        $('.tab.generate').click();
    });
    setupAddCredentialFields();
    setupPasswordGenerator();


    API.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        if (_this[msg.method]) {
            _this[msg.method](msg.args, sender);
        }
    });


    $('#password_search').keypress(function (e) {
        if (e.which === 13) {
            searchCredentials();
        }
    });

    function url_domain(data) {
        var matches = data.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        return matches && matches[1];  // domain will be null if no match is found
    }



    function searchCredentials() {
        $('#searchResults').html('');
        var searchText = $('#password_search').val();
        if (searchText === '') {
            return;
        }
        API.runtime.sendMessage(API.runtime.id, {
            'method': 'searchCredential',
            args: searchText
        }).then(function (result) {
            if (result.length === 0 || !result) {
                $('#searchResults').html(API.i18n.getMessage('no_credentials_found'));
            }
            for (var i = 0; i < result.length; i++) {
                var login = result[i];
                var div = $('<div>', {class: 'account', text: login.label});
                $('<br>').appendTo(div);

                var username = (login.username !== '' ) ? login.username : login.email;
                $('<small>').text(username).appendTo(div);
                $('<br>').appendTo(div);
                $('<small>').text(url_domain(login.url)).appendTo(div);
                /* jshint ignore:start */
                div.click((function (login) {
                    return function () {
                        //enterLoginDetails(login);
                        //API.runtime.sendMessage(API.runtime.id, {method: 'getMasterPasswordSet'})
                        fillLogin(login);
                        //@TODO Ask to update the url of the login
                        API.runtime.sendMessage(API.runtime.id, {
                            'method': 'updateCredentialUrlDoorhanger',
                            args: login
                        })
                    };
                })(login));
                /* jshint ignore:end*/

                picker.find('#searchResults').append(div);
            }
        });
    }

});