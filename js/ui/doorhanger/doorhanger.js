$(document).ready(function () {
    function closeDoorhanger() {
        API.runtime.sendMessage(API.runtime.id, {
            method: "passToParent",
            args: {'injectMethod': 'closeDoorhanger'}
        });
    }
    var dh = $('#password-doorhanger');
    var btn_config = {
        'cancel': function () {
            return {
                text: API.i18n.getMessage('cancel'),
                onClickFn: function () {
                    API.runtime.sendMessage(API.runtime.id, {
                        method: "passToParent",
                        args: {'injectMethod': 'closeDoorhanger'}
                    });
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
                onClickFn: function () {
                    API.runtime.sendMessage(API.runtime.id, {method: "saveMined"});
                    dh.find('.toolbar-text').text(API.i18n.getMessage('saving') + '...');
                    dh.find('.passman-btn').hide();
                }
            };
        },
        'updateUrl': function (data) {
            return {
                text: 'Update',
                onClickFn: function () {
                    API.runtime.sendMessage(API.runtime.id, {method: "updateCredentialUrl", args: data});
                    dh.find('.toolbar-text').text('Saving...');
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


    API.runtime.sendMessage(API.runtime.id, {method: "getDoorhangerData"}).then(function (data) {
        if(!data){
            return;
        }
        var buttons = data.buttons;
        data = data.data;

        var doorhanger_div = $('<div id="password-toolbar">');
        $('<span>', {
            class: 'toolbar-text',
            text: data.title + ' ' + data.username + ' at ' + data.url
        }).appendTo(doorhanger_div);


        $.each(buttons, function (k, button) {
            button = btn_config[button](data);
            var html_button = $('<button class="passman-btn passnman-btn-success"></button>').text(button.text);
            html_button.click(button.onClickFn);
            doorhanger_div.append(html_button);
        });
        dh.html(doorhanger_div);
    });

    var _this = {};

    function minedLoginSaved(args) {
        // If the login added by the user then this is true

        var saved = API.i18n.getMessage('credential_saved');
        var updated = API.i18n.getMessage('credential_updated');
        var action = (args.updated) ? updated : saved;
        $('#password-toolbar').html(action + '!');
        //@TODO update
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