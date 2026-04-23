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

    API.runtime.onInstalled.addListener(function () {
        storage.get('settings').error(function () {
            var prot = (typeof browser !== 'undefined') ? 'moz-extension' : 'chrome-extension';
            var url = prot + '://' + API.runtime.id + '/html/browser_action/browser_action.html';
            API.tabs.create({url: url});
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
    var encryptedFieldSettings = ['accounts'];
    _self.settings = {};
    _self.ticker = null;
    _self.running = false;
    function getSettings() {

        storage.get('settings').then(function (_settings) {
            if ((!_settings || Object.keys(_settings).length === 0 || !_settings.hasOwnProperty('accounts')) && !master_password) {
                return;
            }
            if (!master_password && _settings.hasOwnProperty('accounts') && _settings.accounts.length > 0) {
                _self.settings.isInstalled = 1;
                testMasterPasswordAgainst = _settings.accounts;
                return;
            }

            for (var i = 0; i < encryptedFieldSettings.length; i++) {
                var field = encryptedFieldSettings[i];
                _settings[field] = JSON.parse(PAPI.decryptString(_settings[field], master_password));
            }

            _self.settings = _settings;

            if (!_self.settings.hasOwnProperty('ignored_sites')) {
                _self.settings.ignored_sites = [];
            }

            if (!_self.settings.hasOwnProperty('no_results_found_tab')) {
                _self.settings.no_results_found_tab = 'list';
            }

            if (!_self.settings.hasOwnProperty('enablePasswordPicker')) {
                _self.settings.enablePasswordPicker = !_self.settings.disablePasswordPicker;
            }

            if (!_self.settings.hasOwnProperty('enableAutoFill')) {
                _self.settings.enableAutoFill = !_self.settings.disableAutoFill;
            }

            if (!_self.settings.hasOwnProperty('enableUpdateUrl')) {
                _self.settings.enableUpdateUrl = true;
            }
            if (!_self.settings.hasOwnProperty('passwordPickerGotoList')) {
                _self.settings.passwordPickerGotoList = false;
            }

            getCredentials();

            if (_self.running) {
                clearInterval(_self.ticker);
            }
            _self.running = true;
            _self.ticker = setInterval(function () {

            }, _self.settings.refreshTime * 1000);

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

        if (!settings.hasOwnProperty('ignored_sites')) {
            settings.ignored_sites = [];
        }

        if (!_self.settings.hasOwnProperty('password_picker_first_tab')) {
            _self.settings.disable_browser_autofill = 'list';
        }

        //window.settings contains the run-time settings
        _self.settings = settings;


        storage.set('settings', settings).then(function () {
            getSettings();
        });

    }

    _self.saveSettings = saveSettings;

    function resetSettings() {
        storage.set('settings', {});
        _self.settings = {};
    }

    _self.resetSettings = resetSettings;


    function getCredentials() {
        if (!master_password) {
            return;
        }
        // console.log('Loading vault with the following settings: ', settings);
        var tmpList = [];

        for (var i = 0; i < _self.settings.accounts.length; i++) {
            var account = _self.settings.accounts[i];
            /* jshint ignore:start */
            (function (inner_account) {
                PAPI.host = inner_account.nextcloud_host;
                PAPI.username = inner_account.nextcloud_username;
                PAPI.password = inner_account.nextcloud_password;
		PAPI.getVaults(function(vaults) {
                    if (vaults.hasOwnProperty('error')) {
                        return;
                    }
	            PAPI.getVault(inner_account, function (vault) {
                    if (vault.hasOwnProperty('error')) {
                        return;
                    }
                    var _credentials = vault.credentials;
                    for (var i = 0; i < _credentials.length; i++) {
                        var key = inner_account.vault_password;
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
                        credential.account = inner_account;
                        if (credential.delete_time === 0) {
                            tmpList.push(credential);
                        }

                    }
                    delete vault.credentials;
                    local_vault = vault;
                    local_credentials = tmpList;

                    getSharedCredentials(inner_account);


                });	    
	    });

            }(account));
            /* jshint ignore:end */
        }
    }

    _self.getCredentials = getCredentials;

    function getSharedCredentials(account) {
        PAPI.getCredendialsSharedWithUs(account, account.vault.guid, function (credentials) {
            for (var i = 0; i < credentials.length; i++) {
                var _shared_credential = credentials[i];
                var _shared_credential_data;
                var sharedKey = PAPI.decryptString(_shared_credential.shared_key, account.vault_password);
                try {
                    _shared_credential_data = PAPI.decryptSharedCredential(_shared_credential.credential_data, sharedKey);
                } catch (e) {

                }
                if (_shared_credential_data) {
                    delete _shared_credential.credential_data;
                    _shared_credential_data.acl = _shared_credential;
                    _shared_credential_data.acl.permissions = new SharingACL(_shared_credential_data.acl.permissions);
                    _shared_credential_data.tags_raw = _shared_credential_data.tags;
                    _shared_credential_data.account = account;
                    local_credentials.push(_shared_credential_data);
                }
            }
            updateTabsIcon();
        });
    }

    function getCredentialsByUrl(_url, sender) {
        if (!master_password) {
            return [];
        }
        if (!_url || _url === '') {
            return [];
        }
        if (Array.isArray(_url)) {
            _url = _url.pop();
        }

        var p = document.createElement('a');
        p.href = _url;
        if (p.pathname) {
            //_url = _url.substring(0, _url.lastIndexOf("/"));
        }

        var url = processURL(_url, _self.settings.ignoreProtocol, _self.settings.ignoreSubdomain, _self.settings.ignorePath, _self.settings.ignorePort);
        var found_list = [];
        for (var i = 0; i < local_credentials.length; i++) {
            var credential_url = local_credentials[i].url;
            if (!/^(ht)tps?:\/\//i.test(credential_url) && credential_url !== '' && _url) {
                try {
                    var protocol = _url.split('://').shift();
                    credential_url = protocol + "://" + credential_url;
                } catch (e) {
                    //ignore
                }
            }
            credential_url = processURL(credential_url, _self.settings.ignoreProtocol, _self.settings.ignoreSubdomain, _self.settings.ignorePath, _self.settings.ignorePort);
            if (credential_url) {
                if (credential_url.split("\n").indexOf(url) !== -1) {
                    found_list.push(local_credentials[i]);
                }
            }

        }
        return found_list;
    }

    _self.getCredentialsByUrl = getCredentialsByUrl;


    function saveCredential(credential) {
        //@TODO save shared password
        if (!credential.credential_id) {
            PAPI.createCredential(credential.account, credential, credential.account.vault_password, function (createdCredential) {
                local_credentials.push(createdCredential);
            });
        } else {
            var credential_index;
            for (var i = 0; i < local_credentials.length; i++) {
                if (local_credentials[i].guid === credential.guid) {
                    credential_index = i;
                    break;
                }
            }

            if (credential.hasOwnProperty('acl')) {
                var permissons = new SharingACL(credential.acl.permissions.permission);
                if (!permissons.hasPermission(0x02)) {
                    return;
                }
            }

            PAPI.updateCredential(credential.account, credential, credential.account.vault_password, function (updatedCredential) {
                if (credential_index) {
                    local_credentials[credential_index] = updatedCredential;
                }
            });
        }
    }

    _self.saveCredential = saveCredential;

    function getCredentialByGuid(guid) {
        for (var i = 0; i < local_credentials.length; i++) {
            var credential = local_credentials[i];
            if (credential.guid === guid) {
                return credential;
            }
        }
    }

    _self.getCredentialByGuid = getCredentialByGuid;

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
        if (!_self.settings) {
            return null;
        }
        if (!_self.settings.hasOwnProperty('ignored_sites')) {
            return mined_data[sender.tab.id];
        }
        var matches = _self.settings.ignored_sites.filter(function (item) {
            return typeof item === 'string' && site.indexOf(item) > -1;
        });

        if (matches.length !== 0) {
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
        var site = processURL(_url, false, false, true, false);
        if (_self.settings.ignored_sites.indexOf(site) === -1) {
            _self.settings.ignored_sites.push(site);
            saveSettings(_self.settings);
        }
        clearMined();
    }

    _self.ignoreSite = ignoreSite;

    function ignoreURL(url) {
        if (!_self.settings.hasOwnProperty('ignored_sites')) {
            _self.settings.ignored_sites = [];
        }
        if (_self.settings.ignored_sites.indexOf(url) === -1) {
            _self.settings.ignored_sites.push(url);
            saveSettings(_self.settings);
        }
    }

    _self.ignoreURL = ignoreURL;

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
        if(!_self.settings.enableUpdateUrl){
            return;
        }

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
        var credential = {},
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
        if (!credential.hasOwnProperty('account')) {
            credential.account = args.account;
        }
        credential.username = data.username;
        credential.password = data.password;
        credential.url = sender.tab.url;
        if (credential.guid !== null) {
            PAPI.updateCredential(credential.account, credential, credential.account.vault_password, function (updatedCredential) {
                updatedCredential.account = credential.account;
                if (credential_index) {
                    local_credentials[credential_index] = updatedCredential;
                }
                saveMinedCallback({credential: credential, updated: true, sender: sender});
                delete mined_data[sender.tab.id];
            });
        } else {
            credential.label = sender.tab.title;
            credential.vault_id = credential.account.vault.vault_id;
            PAPI.createCredential(credential.account, credential, credential.account.vault_password, function (createdCredential) {
                createdCredential.account = args.account;
                saveMinedCallback({credential: credential, updated: false, sender: sender});
                local_credentials.push(createdCredential);
                delete mined_data[sender.tab.id];
            });
        }
    }

    _self.saveMined = saveMined;

    function searchCredential(searchText) {
        searchText = searchText.toLowerCase();
        var searchFields = ['label', 'username', 'email', 'url', 'description'];
        var results = [];
        for (var i = 0; i < local_credentials.length; i++) {
            var credential = local_credentials[i];
            for (var f = 0; f < searchFields.length; f++) {
                var field = searchFields[f];
                if (!credential[field]) {
                    continue;
                }

                var field_value = credential[field].toLowerCase();
                if (field_value.indexOf(searchText) !== -1) {
                    results.push(credential);
                    break;
                }
            }
        }
        return results;
    }

    _self.searchCredential = searchCredential;


    function injectCreateCredential(args, sender) {
        var account = getRuntimeSettings().accounts[parseInt(args.vaultIndex)];
        var credential = PAPI.newCredential();
        credential.label = args.label;
        credential.username = args.username;
        credential.password = args.password;
        credential.url = sender.tab.url;
        credential.vault_id = account.vault.vault_id;
        PAPI.createCredential(account, credential, account.vault_password, function (createdCredential) {
            credential.account = account;
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
        if (!_self.settings.hasOwnProperty('enableAutoFill')) {
            return true;
        }
        return _self.settings.enableAutoFill;
    }

    _self.isAutoFillEnabled = isAutoFillEnabled;

    function isAutoSubmitEnabled() {
        if (!_self.settings.hasOwnProperty('enableAutoSubmit')) {
            return false;
        }
        return _self.settings.enableAutoSubmit;
    }

    _self.isAutoSubmitEnabled = isAutoSubmitEnabled;

    var doorhangerData = null;

    function setDoorhangerData(data) {
        doorhangerData = data;
    }

    _self.setDoorhangerData = setDoorhangerData;

    function getDoorhangerData() {
        return doorhangerData;
    }

    _self.getDoorhangerData = getDoorhangerData;

    function closeSetupTab() {
        API.tabs.query({url: 'chrome-extension://' + API.runtime.id + '/html/browser_action/browser_action.html'}).then(function (tabs) {
            if (tabs && tabs[0]) {
                API.tabs.remove(tabs[0].id);
            }
        });
    }

    _self.closeSetupTab = closeSetupTab;

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

