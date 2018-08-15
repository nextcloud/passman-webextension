/* global sjcl */

window.PAPI = (function () {
    var _encryptedFields = ['description', 'username', 'password', 'files', 'custom_fields', 'otp', 'email', 'tags', 'url'];
    var encryption_config = {
        adata: "",
        iter: 1000,
        ks: 256,
        mode: 'ccm',
        ts: 64
    };
    var _API = {
        username: '',
        password: '',
        host: '',

        getVaults: function (callback) {
            api_request({}, '/api/v2/vaults', 'GET', null, callback);
        },
        getVault: function (account, callback) {
            api_request(account, '/api/v2/vaults/' + account.vault.guid, 'GET', null, callback);
        },
        credentialsSet: function () {
            var hostSet = (typeof this.host !== 'undefined');
            var usernameSet = (this.username !== 'undefined');
            var passwordSet = (typeof this.password !== 'undefined');
            return (hostSet && usernameSet && passwordSet);
        },
        decryptString: function (ciphertext, _key) {
            if(!ciphertext || !_key){
                return '';
            }
            ciphertext = window.atob(ciphertext);
            var rp = {};
            try {
                /** global: sjcl */
                return sjcl.decrypt(_key, ciphertext, encryption_config, rp);
            } catch (e) {
                throw e;
            }
        },
        decryptCredential: function (credential, key) {
            for (var i = 0; i < _encryptedFields.length; i++) {
                var field = _encryptedFields[i];
                var fieldValue = credential[field];
                var field_decrypted_value;
                try {
                    field_decrypted_value = this.decryptString(fieldValue, key);
                } catch (e) {
                    console.warn('Field' + field + ' in ' + credential.label + ' could not be parsed! Value:' + fieldValue);
                    //throw e;
                }
                try {
                    credential[field] = JSON.parse(field_decrypted_value);
                } catch (e) {
                    console.warn('Field' + field + ' in ' + credential.label + ' could not be parsed! Value:' + fieldValue);
                }

            }
            return credential;

        },
        encryptString: function (string, _key) {
            var rp = {};
            /** global: sjcl */
            var ct = sjcl.encrypt(_key, string, encryption_config, rp);
            return window.btoa(ct);
        },
        newCredential: function () {
            return {
                'credential_id': null,
                'guid': null,
                'vault_id': null,
                'label': null,
                'description': '',
                'created': null,
                'changed': null,
                'tags': [],
                'email': null,
                'username': null,
                'password': null,
                'url': '',
                'favicon': null,
                'renew_interval': null,
                'expire_time': 0,
                'delete_time': 0,
                'files': [],
                'custom_fields': [],
                'otp': {},
                'hidden': false
            };
        },
        encryptCredential: function (credential, _key) {
            for (var i = 0; i < _encryptedFields.length; i++) {
                var field = _encryptedFields[i];
                var fieldValue = credential[field];
                credential[field] = this.encryptString(JSON.stringify(fieldValue), _key);
            }
            return credential;
        },
        createCredential: function (account, credential, _key, callback) {
            credential = this.encryptCredential(credential, _key);

            credential.expire_time = new Date(credential.expire_time).getTime() / 1000;
            var _that = this;

            api_request(account, '/api/v2/credentials', 'POST', credential, function (r) {
                credential.credential_id = r.credential_id;
                credential.guid = r.guid;
                credential = _that.decryptCredential(credential, _key);
                callback(credential);
            });
        },
        encryptSharedCredential: function (credential, sharedKey, origKey) {
            var _credential = credential;
            _credential.shared_key = this.encryptString(sharedKey, origKey);
            var encrypted_fields = _encryptedFields;
            for (var i = 0; i < encrypted_fields.length; i++) {
                var field = encrypted_fields[i];
                var fieldValue = credential[field];
                _credential[field] = this.encryptString(JSON.stringify(fieldValue), sharedKey);
            }
            return _credential;
        },
        getCredendialsSharedWithUs: function (account, vault_guid, callback) {
            api_request(account, '/api/v2/sharing/vault/' + vault_guid + '/get', 'GET', null, callback);
        },
        decryptSharedCredential: function (credential, sharedKey) {
            var encrypted_fields = _encryptedFields;
            for (var i = 0; i < encrypted_fields.length; i++) {
                var field = encrypted_fields[i];
                var fieldValue = credential[field];
                var field_decrypted_value;
                if (credential.hasOwnProperty(field)) {
                    try {
                        field_decrypted_value = this.decryptString(fieldValue, sharedKey);
                    } catch (e) {
                        throw e;
                    }
                    try {
                        credential[field] = JSON.parse(field_decrypted_value);
                    } catch (e) {
                        console.warn('Field' + field + ' in ' + _credential.label + ' could not be parsed! Value:' + fieldValue);
                        throw e;
                    }
                }
            }
            return credential;
            //console.log(this.decryptCredential(credental, decrypted_key));
        },
        updateCredential: function (account, credential, key, callback) {
            var origKey = key;
            var _credential, _key;

            if (!credential.hasOwnProperty('acl') && credential.hasOwnProperty('shared_key')) {
                if (credential.shared_key) {
                    _key = this.decryptString(credential.shared_key, key);
                }
            }

            if (credential.hasOwnProperty('acl')) {
                _key = this.decryptString(credential.acl.shared_key, key);
            }

            var regex = /(<([^>]+)>)/ig;
            if(credential.description && credential.description !== "") {
                credential.description = credential.description.replace(regex, "");
            }


            if (_key) {
                _credential = this.encryptSharedCredential(JSON.parse(JSON.stringify(credential)), _key, origKey);
            } else {
                _credential = this.encryptCredential(JSON.parse(JSON.stringify(credential)), key);
            }
            delete _credential.shared_key;


            credential.expire_time = new Date(credential.expire_time).getTime() / 1000;

            api_request(account, '/api/v2/credentials/' + credential.guid, 'PATCH', _credential, function () {
                callback(credential);
            });
        }
    };

    var api_request = function (account, endpoint, method, data, callback) {

        var host = (account.hasOwnProperty('nextcloud_host')) ? account.nextcloud_host : _API.host;
        var username = (account.hasOwnProperty('nextcloud_username')) ? account.nextcloud_username : _API.username;
        var password = (account.hasOwnProperty('nextcloud_password')) ? account.nextcloud_password : _API.password;

        var encodedLogin = btoa(username + ":" + password);

        var headers = new Headers();
        headers.append('Authorization', 'Basic ' + encodedLogin);
        headers.append("Accept", " application/json, text/plain, */*");
        var opts = {
            method: method,
            headers: headers,
            credentials: 'omit' // don't send cookies to not confuse nextcloud Auth
        };

        if(data){
            // Prevent leakage of account data;
            if(data.hasOwnProperty('account')){
                delete data.account;
            }
        }

        if(method.toLowerCase() !== 'get'){
            headers.append('content-type','application/json;charset=UTF-8');
            opts.body = JSON.stringify(data);
        }

        var request = new Request(host + '/index.php/apps/passman' + endpoint, opts);

        var timeoutTimer = setTimeout(function () {
            API.notifications.create('Error', 'Error connecting to server (Error: Connection timeout)');
            callback({error: true, result: {statusText: 'Connection timeout', status: 0}});
        }, 10000);

        fetch(request).then(function(response){
            clearTimeout(timeoutTimer);
            if(response.status !== 200){
                callback({error: true, result: {statusText: response.statusText, status: response.status}});
                return;
            }

            var contentType = response.headers.get("content-type");
            if(contentType && contentType.indexOf("application/json") !== -1) {
                return response.json().then(function(json) {
                    if(json){
                        callback(json);
                    } else {
                        callback({error: true, result: {statusText: 'Empty reply from server', status: 0}});
                    }

                });
            } else {
                callback({error: true, result: {statusText: 'Invalid reply from server', status: 0}});
            }

        }).catch(function (e) {
            clearTimeout(timeoutTimer);
            API.notifications.create('Error', 'Error connecting to server (Error: '+ e +')');
            callback({error: true, result: {statusText: e, status: 0}});
        });
    };

    return _API;
}());
