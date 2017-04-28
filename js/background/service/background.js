/* global API */

var background = (function () {
    var storage = new API.Storage();
    var _self = this;
    var _window = {};



    API.runtime.onConnect.addListener(function (port) {

        port.onMessage.addListener(function (msg) {
            if (msg === 'credential_amount') {
                port.postMessage('credential_amount:' + local_credentials.length);
            }

        });

    });

    var master_password = null;

    function getMasterPasswordSet() {
        return (master_password !== null);
    }

    _self.getMasterPasswordSet = getMasterPasswordSet;

    function setMasterPassword(opts) {
        master_password = opts.password;
        if (opts.hasOwnProperty('savePassword') && opts.savePassword === true) {
            // Save the password in plain text on user request.
            // No secure local storage is available :/
            storage.set('master_password', opts.password);
        } else {
            storage.set('master_password', null);
        }

        if (opts.password) {
            getSettings();
        } else {
            displayLogoutIcons();
        }

    }

    _self.setMasterPassword = setMasterPassword;


    var testMasterPasswordAgainst;

    function isMasterPasswordValid(password) {
        //return true;
        try {
            PAPI.decryptString(testMasterPasswordAgainst, password);
            return true;
        } catch (e) {
            return false;
        }
    }

    _self.isMasterPasswordValid = isMasterPasswordValid;


    var local_credentials = [];
    var local_vault = [];
    var encryptedFieldSettings = ['default_vault', 'nextcloud_host', 'nextcloud_username', 'nextcloud_password', 'vault_password'];
    _self.settings = {};
    _self.ticker = null;
    _self.running = false;
    function getSettings() {

        storage.get('settings').then(function (_settings) {

            if (!_settings || !_settings.hasOwnProperty('nextcloud_host')) {
                return;
            }

            if (!master_password && _settings.hasOwnProperty('nextcloud_username') && _settings.hasOwnProperty('vault_password')) {
                _self.settings.isInstalled = 1;
                testMasterPasswordAgainst = _settings.nextcloud_username;
                return;
            }

            for (var i = 0; i < encryptedFieldSettings.length; i++) {
                var field = encryptedFieldSettings[i];
                _settings[field] = JSON.parse(PAPI.decryptString(_settings[field], master_password));
            }


            _self.settings = _settings;


            PAPI.host = _settings.nextcloud_host;
            PAPI.username = _settings.nextcloud_username;
            PAPI.password = _settings.nextcloud_password;
            if (!_settings.vault_password) {
                return;
            }
            if (PAPI.credentialsSet()) {
                getCredentials();
                if (_self.running) {
                    clearInterval(_self.ticker);
                }

                _self.running = true;
                _self.ticker = setInterval(function () {
                    getCredentials();
                }, _self.settings.refreshTime * 1000);
            } else {
                console.log('Login details are missing!');
            }
        });
    }

    _self.getSettings = getSettings;

    function getRuntimeSettings() {
        return _self.settings;
    }

    _self.getRuntimeSettings = getRuntimeSettings;

    function getSetting(name) {
        return _self.settings[name];
    }

    _self.getSetting = getSetting;

    function saveSettings(settings, cb) {
        for (var i = 0; i < encryptedFieldSettings.length; i++) {
            var field = encryptedFieldSettings[i];
            settings[field] = PAPI.encryptString(JSON.stringify(settings[field]), master_password);
        }
        PAPI.host = settings.nextcloud_host;
        PAPI.username = settings.nextcloud_username;
        PAPI.password = settings.nextcloud_password;
        //window.settings contains the run-time settings
        _self.settings = settings;


        storage.set('settings', settings).then(function () {
            getSettings();
        });

    }

    _self.saveSettings = saveSettings;


    function getCredentials() {
        //console.log('Loading vault with the following settings: ', settings);
        var tmpList = [];
        PAPI.getVault(_self.settings.default_vault.guid, function (vault) {
            if (vault.hasOwnProperty('error')) {
                return;
            }
            var _credentials = vault.credentials;
            for (var i = 0; i < _credentials.length; i++) {
                var key = _self.settings.vault_password;
                var credential = _credentials[i];
                if (credential.hidden === 1) {
                    continue;
                }
                var usedKey = key;
                //Shared credentials are not implemented yet
                if (credential.hasOwnProperty('shared_key') && credential.shared_key) {
                    usedKey = PAPI.decryptString(credential.shared_key, key);

                }
                credential = PAPI.decryptCredential(credential, usedKey);
                if (credential.delete_time === 0) {
                    tmpList.push(credential);
                }

            }
            delete vault.credentials;
            local_vault = vault;
            local_credentials = tmpList;
            updateTabsIcon();
        });
    }

    _self.getCredentials = getCredentials;

    function getCredentialsByUrl(_url, sender) {
        if (!master_password) {
            return [];
        }
        if (!_url || _url === '') {
            return [];
        }
        var url = processURL(_url, _self.settings.ignoreProtocol, _self.settings.ignoreSubdomain, _self.settings.ignorePath, _self.settings.ignorePort);
        var found_list = [];
        for (var i = 0; i < local_credentials.length; i++) {
            if (local_credentials[i].url && local_credentials[i].username && local_credentials[i].password) {
                if (local_credentials[i].url.indexOf(url) !== -1) {
                    found_list.push(local_credentials[i]);
                }
            }
        }
        return found_list;
    }

    _self.getCredentialsByUrl = getCredentialsByUrl;


    function getCredentialForHTTPAuth(req) {
        return getCredentialsByUrl(req.url)[0];
    }

    _window.getCredentialForHTTPAuth = getCredentialForHTTPAuth;

    var mined_data = [];

    function minedForm(data, sender) {
        var url = sender.url;
        var existingLogins = getCredentialsByUrl(sender.url);
        var title = API.i18n.getMessage('detected_new_login') + ':';
        var minedMatchingID = null;
        for (var j = 0; j < existingLogins.length; j++) {
            var login = existingLogins[j];
            if (login.username === data.username) {
                if (login.password !== data.password) {
                    minedMatchingID = login.guid;
                    title = API.i18n.getMessage('detected_changed_login') + ':';
                }
                else {
                    //console.log('No changes detected');
                    delete mined_data[sender.tab.id];
                    return;
                }
            }
        }
        mined_data[sender.tab.id] = {
            title: title,
            url: url,
            username: data.username,
            password: data.password,
            label: sender.title,
            guid: minedMatchingID
        };

        //console.log('Done mining, ', mined_data, sender.tab.id);
    }

    _self.minedForm = minedForm;

    function getMinedData(args, sender) {
        //console.log('Fecthing  mined data for tab id', sender.tab.id)
        var senderUrl = sender.tab.url;
        var site = processURL(senderUrl, _self.settings.ignoreProtocol, _self.settings.ignoreSubdomain, _self.settings.ignorePath, _self.settings.ignorePort);
        var matches = _self.settings.ignored_sites.filter(function (item) {
            return typeof item === 'string' && site.indexOf(item) > -1;
        });

        if(matches.length !== 0){
            return null;
        }
        return mined_data[sender.tab.id];
    }

    _self.getMinedData = getMinedData;

    function clearMined(args, sender) {
        delete mined_data[sender.tab.id];
    }

    _self.clearMined = clearMined;

    function saveMinedCallback(args) {
        createIconForTab(args.sender.tab);
        API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
            API.tabs.sendMessage(args.sender.tab.id, {method: "minedLoginSaved", args: args}).then(function (response) {
            });
        });
    }

    function ignoreSite(_url) {
        if (!_self.settings.hasOwnProperty('ignored_sites')) {
            _self.settings.ignored_sites = [];
        }
        var site = processURL(_url, _self.settings.ignoreProtocol, _self.settings.ignoreSubdomain, _self.settings.ignorePath, _self.settings.ignorePort);
        if (_self.settings.ignored_sites.indexOf(site) === -1) {
            _self.settings.ignored_sites.push(site);
            saveSettings(_self.settings);
        }
    }

    _self.ignoreSite = ignoreSite;

    function passToParent(args, sender) {
        API.tabs.sendMessage(sender.tab.id, {method: args.injectMethod, args: args.args}).then(function (response) {
        });
    }

    _self.passToParent = passToParent;

    function getActiveTab(opt) {
        API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
            var tab = tabs[0];
            API.tabs.sendMessage(tab.id, {method: opt.returnFn, args: tab}).then(function (response) {
            });
        });
    }

    _self.getActiveTab = getActiveTab;

    function updateCredentialUrlDoorhanger(login) {
        API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
            var tab = tabs[0];
            var data = login;
            data.url = tab.url;
            data.title = API.i18n.getMessage('detected_changed_url') + ':';
            API.tabs.sendMessage(tab.id, {
                method: 'showUrlUpdateDoorhanger',
                args: {data: data}
            });
        });
    }

    _self.updateCredentialUrlDoorhanger = updateCredentialUrlDoorhanger;

    function updateCredentialUrl(data, sender) {
        mined_data[sender.tab.id] = data;
        saveMined({}, sender);

    }

    _self.updateCredentialUrl = updateCredentialUrl;

    function saveMined(args, sender) {
        var data = mined_data[sender.tab.id];
        var credential,
            credential_index;

        if (data.guid === null) {
            credential = PAPI.newCredential();
        } else {
            for (var i = 0; i < local_credentials.length; i++) {
                if (local_credentials[i].guid === data.guid) {
                    credential = local_credentials[i];
                    credential_index = i;
                    break;
                }
            }
        }
        credential.username = data.username;
        credential.password = data.password;
        credential.url = sender.tab.url;
        if (credential.guid !== null) {
            PAPI.updateCredential(credential, _self.settings.vault_password, function (updatedCredential) {
                if (credential_index) {
                    local_credentials[credential_index] = updatedCredential;
                }
                saveMinedCallback({credential: credential, updated: true, sender: sender});
                delete mined_data[sender.tab.id];
            });
        } else {
            credential.label = sender.tab.title;
            credential.vault_id = local_vault.vault_id;
            PAPI.createCredential(credential, _self.settings.vault_password, function (createdCredential) {
                saveMinedCallback({credential: credential, updated: false, sender: sender});
                local_credentials.push(createdCredential);
                delete mined_data[sender.tab.id];
            });
        }
    }

    _self.saveMined = saveMined;

    function searchCredential(searchText) {
        var searchFields = ['label', 'username', 'email', 'url', 'description'];
        var results = [];
        for (var i = 0; i < local_credentials.length; i++) {
            var credential = local_credentials[i];
            for (var f = 0; f < searchFields.length; f++) {
                var field = searchFields[f];
                if (credential[field] && credential[field].indexOf(searchText) !== -1) {
                    results.push(credential);
                    break;
                }
            }
        }
        return results;
    }

    _self.searchCredential = searchCredential;


    function injectCreateCredential(args, sender) {
        var credential = PAPI.newCredential();
        credential.label = args.label;
        credential.username = args.username;
        credential.password = args.password;
        credential.vault_id = local_vault.vault_id;
        credential.url = sender.tab.url;
        PAPI.createCredential(credential, _self.settings.vault_password, function (createdCredential) {
            saveMinedCallback({credential: credential, updated: false, sender: sender, selfAdded: true});
            local_credentials.push(createdCredential);

        });
    }

    self.injectCreateCredential = injectCreateCredential;

    function isVaultKeySet() {
        return (_self.settings.vault_password !== null);
    }

    _self.isVaultKeySet = isVaultKeySet;

    function isAutoFillEnabled() {
        if (!_self.settings.hasOwnProperty('disableAutoFill')) {
            return true;
        }
        return (_self.settings.disableAutoFill === false);
    }

    _self.isAutoFillEnabled = isAutoFillEnabled;

    var doorhangerData = null;
    function setDoorhangerData(data) {
        doorhangerData = data;
    }
    _self.setDoorhangerData = setDoorhangerData;

    function getDoorhangerData() {
        return doorhangerData;
    }
    _self.getDoorhangerData = getDoorhangerData;

    API.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

        if (!msg || !msg.hasOwnProperty('method')) {
            return;
        }
        var result = false;
        if (_self[msg.method]) {
            result = _self[msg.method](msg.args, sender);
        } else {
            console.warn('[NOT FOUND] Method call', msg.method, 'args: ', msg.args);
        }

        sendResponse(result);
    });

    var defaultColor = '#0082c9';

    function createIconForTab(tab) {
        if (!master_password) {
            return;
        }
        var tabUrl = tab.url;
        var logins = getCredentialsByUrl(tabUrl);
        if (tab.active) {
            window.contextMenu.setContextItems(logins);
        }
        var credentialAmount = logins.length;
        API.browserAction.setBadgeText({
            text: credentialAmount.toString(),
            tabId: tab.id
        });
        API.browserAction.setBadgeBackgroundColor({
            color: defaultColor,
            tabId: tab.id
        });

        var plural = (credentialAmount === 1) ? API.i18n.getMessage('credential') : API.i18n.getMessage('credentials');
        API.browserAction.setTitle({
            title: API.i18n.getMessage('browser_action_title_login', [credentialAmount.toString(), plural.toString()]),
            tabId: tab.id
        });
    }

    function displayLogoutIcons() {
        if (_self.settings) {
            API.tabs.query({}).then(function (tabs) {
                for (var t = 0; t < tabs.length; t++) {
                    var tab = tabs[t];
                    API.browserAction.setBadgeText({
                        text: '🔑',
                        tabId: tab.id
                    });
                    API.browserAction.setBadgeBackgroundColor({
                        color: '#ff0000',
                        tabId: tab.id
                    });
                    API.browserAction.setTitle({
                        title: API.i18n.getMessage('browser_action_title_locked'),
                        tabId: tab.id
                    });
                }
            });
        }
    }

    function updateTabsIcon() {
        API.tabs.query({}).then(function (tabs) {
            for (var t = 0; t < tabs.length; t++) {
                var tab = tabs[t];
                createIconForTab(tab);
            }
        });
    }


    API.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (master_password) {
            createIconForTab(tab);
        } else {
            displayLogoutIcons();
        }
    });

    API.tabs.onActivated.addListener(function () {
        API.tabs.query({active: true, currentWindow: true}).then(function (tabs) {
            if (master_password) {
                createIconForTab(tabs[0]);
            } else {
                displayLogoutIcons();
            }
        });
    });

    displayLogoutIcons();

    storage.get('master_password').then(function (password) {
        if (password) {
            master_password = password;
            API.api.browserAction.setBadgeBackgroundColor({
                color: defaultColor
            });
        }
        getSettings();
    }).error(function (error) {
        if (error === "Data not found") {
            getSettings();
        }
    });
    return _window;
}());

