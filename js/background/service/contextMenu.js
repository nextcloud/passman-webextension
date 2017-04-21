/* global API */

/**
 * Nextcloud - passman
 *
 * @copyright Copyright (c) 2016, Sander Brand (brantje@gmail.com)
 * @copyright Copyright (c) 2016, Marcos Zuriaga Miguel (wolfi@wolfi.es)
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

window.contextMenu = (function () {
    'use strict';
    var storage = new API.Storage();
    var exportContextMenu = {
        setContextItems: function (logins) {
            var i,f, field;
            var fields = [
                {menu: 'autoFill:', field: 'autoFill', found: false},
                {field: 'username', menu: 'copy:User', found: false},
                {field: 'password', menu: 'copy:Pass', found: false},
                {field: 'url', menu: 'copy:Url', found: false},
                {field: 'totp', menu: 'copy:OTP', found: false}
            ];
            API.contextMenus.removeAll();
            initMenus();

            for (i = 0; i < logins.length; i++) {
                var login = logins[i];
                login.autoFill = (!login.hasOwnProperty('autoFill')) ? true : login.autoFill;
                for (f = 0; f < fields.length; f++) {
                    field = fields[f];
                    if (field.field === 'totp' && login.otp) {
                        login.totp = login.otp.secret;
                    }
                    if (login[field.field]) {
                        fields[f].found = true;
                        /* jshint ignore:start */
                        createMenuItem(field.menu, field.menu + ':' + login.guid, login.label, (function (field, login) {
                            return function () {
                                itemClickCallback(field, login);
                            };
                        })(field, login));
                        /* jshint ignore:end */
                    }
                }
            }

            for (f = 0; f < fields.length; f++) {
                field = fields[f];
                if(field.found === false){
                    API.contextMenus.remove(field.menu);
                }
            }

        },
        addPasswordGenerator: function(){
            createMenuItem('generatePassword', 'copyGen', 'And copy to clipboard', function(){
                generatePass(function (generated_password) {
                    API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
                        API.tabs.sendMessage(tabs[0].id, {method: "copyText", args: generated_password});
                    });
                });
            });

            createMenuItem('generatePassword', 'fill', 'And fill fields', function(){
                generatePass(function (generated_password) {
                    var login = {
                        password: generated_password
                    };
                    API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
                        API.tabs.sendMessage(tabs[0].id, {method: "enterLoginDetails", args: login}).then(function (response) {
                        });
                    });
                });

            });
        }
    };


    function generatePass(cb){
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
            /* jshint ignore:start */
            var password = generatePassword(_settings['length'],
                _settings.useUppercase,
                _settings.useLowercase,
                _settings.useDigits,
                _settings.useSpecialChars,
                _settings.minimumDigitCount,
                _settings.avoidAmbiguousCharacters,
                _settings.requireEveryCharType);
            /* jshint ignore:end */
            cb(password);
        }).error(function () {
            /* jshint ignore:start */
            var password = generatePassword(default_settings['length'],
                default_settings.useUppercase,
                default_settings.useLowercase,
                default_settings.useDigits,
                default_settings.useSpecialChars,
                default_settings.minimumDigitCount,
                default_settings.avoidAmbiguousCharacters,
                default_settings.requireEveryCharType);
            /* jshint ignore:end */
            cb(password);
        });
    }

    function initMenus() {
        API.contextMenus.create({
            id: 'autoFill:',
            title: 'Auto fill',
            contexts: ['page']
        });

        API.contextMenus.create({
            id: 'generatePassword',
            title: 'Generate password',
            contexts: ['page']
        });

        API.contextMenus.create({
            id: 'copy:User',
            title: 'Copy username',
            contexts: ['page']
        });

        API.contextMenus.create({
            id: 'copy:Pass',
            title: 'Copy password',
            contexts: ['page']
        });


        API.contextMenus.create({
            id: 'copy:Url',
            title: 'Copy URL',
            contexts: ['page']
        });

        API.contextMenus.create({
            id: 'copy:OTP',
            title: 'Copy OTP',
            contexts: ['page']
        });
        exportContextMenu.addPasswordGenerator();
    }

    function createMenuItem(parentId, id, label, clickcb) {
        API.contextMenus.create({
            id: id,
            title: label,
            contexts: ["page"],
            parentId: parentId,
            onclick: clickcb
        });
    }

    function itemClickCallback(menu_action, login) {
        var action = menu_action.menu.split(':', 1)[0];

        if (action === 'copy') {

            API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
                var text = login[menu_action.field];
                if(menu_action.menu.indexOf('OTP') !== -1){
                    window.OTP.secret = login.totp;
                    text =  window.OTP.getOTP();
                }
                API.tabs.sendMessage(tabs[0].id, {method: "copyTextToClipboard", args: text});
            });
            return;
        }

        if (action === 'autoFill') {
            API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
                API.tabs.sendMessage(tabs[0].id, {method: "enterLoginDetails", args: login});
            });
        }
    }


    API.contextMenus.removeAll();
    initMenus();

    return exportContextMenu;

}());