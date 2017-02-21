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
    function initMenus() {
        API.contextMenus.create({
            id: 'autoFill:',
            title: 'Auto fill',
            contexts: ['all']
        });

        API.contextMenus.create({
            id: 'copy:User',
            title: 'Copy username',
            contexts: ['all']
        });

        API.contextMenus.create({
            id: 'copy:Pass',
            title: 'Copy password',
            contexts: ['all']
        });


        API.contextMenus.create({
            id: 'copy:Url',
            title: 'Copy URL',
            contexts: ['all']
        });
       /* API.contextMenus.create({
            id: 'copy:OTP',
            title: 'Copy OTP',
            contexts: ['all']
        });*/
    }

    function createMenuItem(parentId, id, label, clickcb) {
        API.contextMenus.create({
            id: id,
            title: label,
            contexts: ["all"],
            parentId: parentId,
            onclick: clickcb
        });
    }

    function itemClickCallback(menu_action, login) {
        var action = menu_action.menu.split(':', 1)[0];

        if (action === 'copy') {
            copyTextToClipboard(login[menu_action.field]);
            return;
        }

        if (action === 'autoFill') {
            API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
                API.tabs.sendMessage(tabs[0].id, {method: "enterLoginDetails", args: login}).then(function (response) {
                });
            });
        }
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
    API.contextMenus.removeAll();
    initMenus();

    return {
        setContextItems: function (logins) {

            var fields = [
                {menu: 'autoFill:', field: 'autoFill'},
                {field: 'username', menu: 'copy:User'},
                {field: 'password', menu: 'copy:Pass'},
                {field: 'url', menu: 'copy:Url'},
               // {field: 'totp', menu: 'copy:OTP'}
            ];
            API.contextMenus.removeAll();
            initMenus();

            for (var i = 0; i < logins.length; i++) {
                var login = logins[i];
                login.autoFill = true;
                for (var f = 0; f < fields.length; f++) {
                    var field = fields[f];
                    if (field['field'] === 'totp' && login.otp) {
                        login.totp = login.otp.secret;
                    }
                    if (login[field['field']]) {
                        createMenuItem(field['menu'], field['menu'] + ':' + login.guid, login.label, (function (field, login) {
                            return function () {
                                itemClickCallback(field, login);
                            };
                        })(field, login));
                    }
                }
            }
        }
    }

}());