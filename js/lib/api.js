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
            api_request('/api/v2/vaults', 'GET', null, callback);
        },
        getVault: function (vault_guid, callback) {
            api_request('/api/v2/vaults/' + vault_guid, 'GET', null, callback);
        },
        credentialsSet: function () {
            var hostSet = (typeof this.host !== 'undefined');
            var usernameSet = (this.username !== 'undefined');
            var passwordSet = (typeof this.password !== 'undefined');
            return (hostSet && usernameSet && passwordSet);
        },
        decryptString: function (ciphertext, _key) {
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
                    throw e;
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
                'description': null,
                'created': null,
                'changed': null,
                'tags': [],
                'email': null,
                'username': null,
                'password': null,
                'url': null,
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
        createCredential: function (credential, _key, callback) {
            credential = this.encryptCredential(credential, _key);

            credential.expire_time = new Date(credential.expire_time).getTime() / 1000;
            var _that = this;

            api_request('/api/v2/credentials', 'POST', credential, function (r) {
                credential.credential_id = r.credential_id;
                credential.guid = r.guid;
                credential = _that.decryptCredential(credential, _key);
                callback(credential);
            });
        },
        updateCredential: function (credential, _key, callback) {
            var _that = this;
            credential = this.encryptCredential(credential, _key);
            credential.expire_time = new Date(angular.copy(credential.expire_time)).getTime() / 1000;
            api_request('/api/v2/credentials/' + credential.guid, 'PATCH', credential, function (r) {
                r = _that.decryptCredential(r, _key);
                callback(r);
            });
        }
    };

    var api_request = function (endpoint, method, data, callback) {
        var encodedLogin = btoa(_API.username + ":" + _API.password);

        var headers = new Headers();
        headers.append('Authorization', 'Basic ' + encodedLogin);
        headers.append("Accept", " application/json, text/plain, */*");
        var opts = {
            method: method,
            headers: headers

        };

        if(method.toLowerCase() !== 'get'){
            headers.append('content-type','application/json;charset=UTF-8');
            opts.body = JSON.stringify(data);
        }

        var request = new Request(_API.host + '/index.php/apps/passman' + endpoint, opts);

        fetch(request).then(function(response){
            if(response.status != 200){
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
            callback({error: true, result: {statusText: e, status: 0}});
        });
    };

    return _API;
}());