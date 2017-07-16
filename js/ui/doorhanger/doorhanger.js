$(document).ready(function () {
    function closeDoorhanger() {
        $('#password-doorhanger').slideUp(function () {
            API.runtime.sendMessage(API.runtime.id, {
                method: "passToParent",
                args: {'injectMethod': 'closeDoorhanger'}
            });
        });
    }

    function resizeIframe(height) {
        API.runtime.sendMessage(API.runtime.id, {
            method: "passToParent",
            args: {'injectMethod': 'resizeIframe', args: height}
        });
    }

    var default_account;
    var dh = $('#password-doorhanger');
    var btn_config = {
        'cancel': function () {
            return {
                text: API.i18n.getMessage('cancel'),
                onClickFn: function () {
                    closeDoorhanger();
                    API.runtime.sendMessage(API.runtime.id, {method: "clearMined"});
                }
            };
        },
        'save': function (data) {
            var save = API.i18n.getMessage('save');
            var update = API.i18n.getMessage('update');
            var btnText = (data.guid === null) ? save : update;
            return {
                text: btnText,
                onClickFn: function (account) {
                    API.runtime.sendMessage(API.runtime.id, {method: "saveMined", args: {account: account}});
                    dh.find('.toolbar-text').text(API.i18n.getMessage('saving_to', [account.vault.name]) + '...');
                    dh.find('.passman-btn').hide();
                },
                isCreate: (data.guid === null)
            };
        },
        'updateUrl': function (data) {
            return {
                text: 'Update',
                onClickFn: function () {
                    API.runtime.sendMessage(API.runtime.id, {method: "updateCredentialUrl", args: data});
                    dh.find('.toolbar-text').text(API.i18n.getMessage('saving'));
                    dh.find('.passman-btn').hide();
                }
            };
        },
        'ignore': function (data) {
            return {
                text: API.i18n.getMessage('ignore_site'),
                onClickFn: function () {
                    //closeToolbar();
                    API.runtime.sendMessage(API.runtime.id, {method: "ignoreSite", args: data.currentLocation});
                    dh.find('.toolbar-text').text(API.i18n.getMessage('site_ignored'));
                    dh.find('.passman-btn').hide();
                    setTimeout(function () {
                        closeDoorhanger();
                    }, 3000);
                }
            };
        }
    };

    API.runtime.sendMessage(API.runtime.id, {method: "getRuntimeSettings"}).then(function (settings) {
        var accounts = settings.accounts;
        default_account = accounts[0];
        API.runtime.sendMessage(API.runtime.id, {method: "getDoorhangerData"}).then(function (data) {
            if (!data) {
                return;
            }
            var buttons = data.buttons;
            data = data.data;
            var username = (data.username) ? data.username : data.email;
            var doorhanger_div = $('<div id="password-toolbar" style="display: none;">');
            $('<span>', {
                class: 'toolbar-text',
                text: data.title + ' ' + username + ' at ' + data.url
            }).appendTo(doorhanger_div);


            $.each(buttons, function (k, button) {
                var btn = button;

                button = btn_config[btn](data);
                var html_button;

                if (btn === 'save') {
                    var btn_text = (button.isCreate && accounts.length > 1) ? API.i18n.getMessage('save_to','') : API.i18n.getMessage('save');
                    btn_text = (!button.isCreate) ? API.i18n.getMessage('update') : btn_text;
                    html_button = $('<button class="passman-btn passnman-btn-success"></button>').text(btn_text);
                    if (button.isCreate && accounts.length > 1) {
                        var caret_container =  $('<span class="caret-container"></span>').text(default_account.vault.name);
                        var caret = $('<span class="fa fa-caret-down" style="margin-left: 5px; cursor: pointer;"></span>');
                        var menu = $('<div class="select_account" style="display: none;"></div>');
                        caret_container.append(caret);
                        html_button.append(caret_container);
                        for (var i = 1; i < accounts.length; i++) {
                            var a = accounts[i];
                            var item = $('<div class="account"></div>').text(API.i18n.getMessage('save_to', [a.vault.name]));
                            /* jshint ignore:start */
                            (function (account, item) {
                                item.click(function (e) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    button.onClickFn(account);
                                });
                            })(a, item);
                            /* jshint ignore:end */
                            menu.append(item);
                        }
                        caret_container.click(function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                            var isVisible = ($('.select_account').is(':visible'));
                            var height = (isVisible) ? 0 : accounts.length * 29;
                            if (!isVisible) {
                                resizeIframe(height);
                            }
                            menu.slideToggle(function () {
                                if(isVisible){
                                    resizeIframe(height);
                                }
                            });
                        });
                        caret.after(menu);
                    }
                    html_button.click(function () {
                        button.onClickFn(default_account);
                    });
                } else {
                    html_button = $('<button class="passman-btn passnman-btn-success"></button>').text(button.text);
                    html_button.click(function () {
                        button.onClickFn();
                    });
                }

                doorhanger_div.append(html_button);
            });
            dh.html(doorhanger_div);
            doorhanger_div.slideDown();
        });
    });
    var _this = {};

    function minedLoginSaved(args) {
        // If the login added by the user then this is true

        var saved = API.i18n.getMessage('credential_saved');
        var updated = API.i18n.getMessage('credential_updated');
        var action = (args.updated) ? updated : saved;
        $('#password-toolbar').html(action + '!');
        setTimeout(function () {
            closeDoorhanger();
        }, 2500);

    }

    _this.minedLoginSaved = minedLoginSaved;
    API.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        //console.log('Method call', msg.method);
        if (_this[msg.method]) {
            _this[msg.method](msg.args, sender);
        }
    });
});