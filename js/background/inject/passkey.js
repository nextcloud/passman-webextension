/* jshint esversion: 11 */

/* injection functions run as eartly as possible */

const creds = self.navigator.credentials;
const passkeySupported =
      typeof creds?.get === 'function' &&
      typeof creds?.create === 'function';

const prevCreate = creds.create.bind(self.navigator.credentials);
const prevGet = creds.get.bind(self.navigator.credentials);

function toBase64arr(arr) {
    return toBase64arrNoUrl(arr).replaceAll('+', '-')
        .replaceAll('/', '_').replaceAll('=', '');
}

function toBase64arrNoUrl(arr) {
    const bytes = new Uint8Array(arr);
    const bs = String.fromCharCode(...bytes);
    return btoa(bs);
}

/* mutate a JSON object to encode all arraybuffers as base64 so that
* JSON.stringify will work on it */
function toBase64(o) {
    for (const k in o) {

        if (o[k].constructor.name === 'ArrayBuffer') {
            o[k] = toBase64arrNoUrl(o[k]);
        } else if (typeof o === 'object') {
            toBase64(o[k]);
        }
    }
}

function WArray(arr) {
    if (arr == null)
        return null;
    return new Uint8Array(arr);
}

function getAttestationResponse(r) {
    const response = {
        attestationObject: WArray(r.attestation_object).buffer,
        clientDataJSON: WArray(r.client_data_json).buffer,
        getAuthenticatorData: () => clone(WArray(r.authenticator_data).buffer),
        getPublicKey: () => clone(WArray(r.public_key).buffer),
        getPublicKeyAlgorithm: () => clone(r.public_key_algorithm),
        getTransports: () => clone(r.transports)
    };
    response.toJSON = () => ({
        attestationObject: toBase64arr(response.attestationObject),
        clientDataJSON: toBase64arr(response.clientDataJSON),
        authenticatorData: toBase64arr(response.getAuthenticatorData()),
        publicKey: toBase64arr(response.getPublicKey()),
        publicKeyAlgorithm: response.getPublicKeyAlgorithm(),
        transports: response.getTransports()
    });
    Object.setPrototypeOf(response, AuthenticatorAttestationResponse.prototype);
    return response;
}

function getAssertionResponse(r) {
    const response = {
        clientDataJSON: WArray(r.client_data_json).buffer,
        authenticatorData: WArray(r.authenticator_data),
        signature: WArray(r.signature),
        userHandle: r.user_handle
    };
    response.toJSON = () => ({
        clientDataJSON: toBase64arr(response.clientDataJSON),
        authenticatorData: toBase64arr(response.authenticatorData),
        signature: toBase64arr(response.signature),
        userHandle: response.user_handle
    });
    Object.setPrototypeOf(response, AuthenticatorAssertionResponse.prototype);
    return response;
}

function getCred(c, r) {
    const cred = {
        authenticatorAttachment: c.authenticator_attachment,
        id: c.id,
        rawId: WArray(c.raw_id).buffer,
        response: r,
        type: c.type,
        getClientExtensionResults: () => clone(c.client_extension_results),
    };
    cred.toJSON = () => clone({
        authenticatorAttachment: cred.authenticatorAttachment,
        id: cred.id,
        rawId: toBase64arr(cred.rawId),
        response: r.toJSON(),
        type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults()
    });
    Object.setPrototypeOf(cred, PublicKeyCredential.prototype);

    return cred;
}
/* on firefox, data must be cloned to share with a page */
function clone(o) {
    if (typeof window === 'undefined')
        return o;
    return cloneInto(o, window, {cloneFunctions: true});
}

/* firefox can't cloneInto a promise, must use window.Promise */
function wPromise(f) {
    if (typeof window !== 'undefined')
        return new window.Promise(f);
    else
        return new Promise(f);
}

/* this should be an async function but because of firefox
 * permission problems, it has to be a sync function returning
 * a cross window promise.  Don't ask why firefox couldn't simply
 * cloneInto the promise ...
 */
function createCredential(options) {
    return wPromise(async function(resolve) {
        console.log("create new passkey credential", options);

        var pk = options.publicKey;

        toBase64(pk);

        console.log("request is ", pk);

        const name = pk.user.name ?? pk.user.displayName;

        const keys = await API.runtime.sendMessage(API.runtime.id,
                               {method: 'passkey.query',
                                args: {
                                    domain: location.hostname,
                                    userId: pk.user.id
                                }});

        if (keys.length != 0) {
            alert('passkey already exists for user "' + name + '".');
            resolve(await prevCreate(options));
        }

        if (!confirm('Create a new passkey for user "' + name + '"?'))
            resolve(await prevCreate(options));

        var ret = await API.runtime.sendMessage(API.runtime.id,
                            {method: 'passkey.generate',
                             args: {
                                 domain: location.hostname,
                                 request: JSON.stringify(pk)
                             }})
            .then(async function (ret) {
                if (ret != null)
                    return ret;
                else
                    return await prevCreate(options);
            });
        console.log('ret = ', ret);
        const c = ret.credential;
        const r = c.response;
        const response = getAttestationResponse(r);
        const cred = getCred(c, response);
        resolve(clone(cred));
    });
}

function getCredential(options) {
    return wPromise(async function(resolve) {
        console.log("get passkey credential", options);

        pk = options.publicKey;
        toBase64(pk);

        console.log('request is ', pk);

        var keys = await API.runtime.sendMessage(API.runtime.id,
                             {method: 'passkey.query',
                              args: {
                                  domain: location.hostname
                              }});
        if (keys.length == 0)
            return prevGet(options);

        if (keys.length == 1) {
            const name = keys[0].userName ?? keys[0].userDisplayName;
            if (!confirm('Log in to site with passkey for "' + name + '"?'))
                return prevGet(options);
        } else {
            // fixme: need selector for multiple users
            return prevGet(options);
        }

        var ret = await API.runtime.sendMessage(API.runtime.id,
                            {method: 'passkey.get',
                             args: {
                                 domain: location.hostname,
                                 request: pk
                             }})
            .then(async function (ret) {
                if (ret != null)
                    return ret;
                else
                    return await prevGet(options);
            });
        console.log('got ret = ', ret);
        const c = ret.credential;
        const r = c.response;
        const response = getAssertionResponse(r);
        const cred = getCred(c, response);
        resolve(clone(cred));
    });
}

/* firefox uses exportFunctions */
function exporter(fn, target, options) {
    if (globalThis.exportFunction != null)
        exportFunction(fn, target, options);
    else
        target[options.defineAs] = fn;
}

if (passkeySupported) {
    console.log("Passkeys are supported");

    if (creds != null) {
        exporter(createCredential, creds, {defineAs: 'create'});
        exporter(getCredential, creds, {defineAs: 'get'});

        if (self.PublicKeyCredential) {
            console.log("have publickeycredential");
            // required to get the correct client capabilities
            exporter(function () { return true; }, self.PublicKeyCredential, {defineAs: 'isConditionalMediationAvailable'});
            exporter(function () { return true; }, self.PublicKeyCredential, {defineAs: 'isUserVerifyingPlatformAuthenticatorAvailable'});
        } else {
            console.log("NO publickeycredential");
        }
    }
}

