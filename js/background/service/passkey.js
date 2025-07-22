/* global API */
/* jshint esversion: 11 */

const passkey = (function () {
    var _export = {};

    var core = {};

    function toBase64arrNoUrl(arr) {
        const bytes = new Uint8Array(arr);
        const bs = String.fromCharCode(...bytes);
        return btoa(bs);
    }

    function urltweak(arr) {
        return arr.replaceAll('+', '-')
            .replaceAll('/', '_')
            .replaceAll('=', '');
    }

    class Passkey {
        constructor(ret) {
            this.passkey = ret.passkey;
            this.domain = ret.domain;
            this.id = ret.credential.id;
            this.userName = ret.user_name;
            this.userDisplayName = ret.user_display_name;
            this.userId = toBase64arrNoUrl(ret.user_id);
        }
    }

    var wasmFile = fetch('/node_modules/@protontech/pass-rust-core/worker/proton_pass_web_bg.wasm');
    var passjs = import('/node_modules/@protontech/pass-rust-core/worker/proton_pass_web_bg.js').then(async function (ret) {
        var wasm = await WebAssembly.instantiateStreaming(wasmFile, {'./proton_pass_web_bg.js': ret})
            .then(function (value) {
                var exports = value.instance.exports;

                console.log('[passman] wasm instantiated');

                return exports;
            })
            .catch(function (error) {
                console.error('[passman] instantiate webassembly failed');
                throw (error);
            });
        ret.__wbg_set_wasm(wasm);
        core = ret;
        console.log('[passman] wasm exports: ', ret.library_version());

        return ret;
    }).catch(function (err) {
        console.error('[passman] failed to load js for rust');
        throw (err);
    });

    async function ensureCore() {
        await passjs;
    }

    function getPasses(domain) {
        const logins = background.getCredentialsForPasskey(domain);
        return logins.map((x) => x.passkey)
            .filter((x) => x != null);
    }

    _export.generate = async function (args, sender) {
        ensureCore();

        console.log('in generate_passkey core = ', core != null);
        console.log('request = ', args.request);

        request = JSON.parse(args.request);

        const name = request.user.name ?? request.user.displayName;

        var ret = await core.generate_passkey(args.domain, args.request);
        if (ret == null)
            return ret;

        /* in case we have a non passkey login we're converting to passkey */
        logins = background.getCredentialsForPasskey(args.domain)
            .filter((x) => x.username == name);

        var credential;

        if (logins.length == 0) {
            credential = PAPI.newCredential();
            credential.passkey = new Passkey(ret);
            credential.username = name;
            credential.password = '';
            credential.url = 'https://' + args.domain;
            credential.label = sender.tab.title;
        } else {
            credential = logins[0];
            credential.passkey = new Passkey(ret);
        }
        background.savePasskey(credential);
        return ret;
    };

    _export.get = function (args, sender) {
        ensureCore();

        const request = args.request;

        console.log('in passkey get, request =', request);
        const passes = getPasses(args.domain);
        const keys = passes.filter((p) =>
            (p.domain == args.domain &&
             (request.allowCredentials == null ||
              request.allowCredentials.length == 0 ||
              request.allowCredentials.find((e) => (urltweak(e.id) == p.id)) !== undefined)));
        if (keys.length == 0) {
            console.error('no keys found');
            return null;
        }
        console.log('found key = ', keys[0]);
        const content = new Uint8Array(keys[0].passkey);
        console.log('content is ', content);

        return core.resolve_passkey_challenge(args.domain, content, JSON.stringify(request));
    };

    _export.query = function (args, sender) {
        ensureCore();

        console.log('in passkey query, args = ', args);
        const passes = getPasses(args.domain);
        const keys = passes.filter((p) => (p.domain == args.domain  &&
                                           (args.userId == null || p.userId == args.userId)))
              .map((x) => ({
                  userId: x.userId,
                  userName: x.userName,
                  userDisplayName: x.userDisplayName
              }));
        return keys;
    };

    return _export;
}());
