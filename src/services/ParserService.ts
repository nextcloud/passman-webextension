import tlds from 'assets/tlds.json';

export class ParserService {
    public static processURL = (inputUrl: string, ignoreProtocol: boolean, ignoreSubdomain: boolean, ignorePath: boolean, ignorePort: boolean) => {
        if (inputUrl === null || inputUrl === "") {
            return inputUrl;
        }

        const { hostname, pathname, port, protocol } = ParserService.parseUrl(inputUrl);

        if (hostname === null || hostname === "") {
            return inputUrl;
        }

        const splitURL = hostname.split(".");
        let isIP = false;
        if (splitURL.length === 4) {
            isIP = true;
            for (const splitter of splitURL) {
                if (Number.isNaN(splitter) || parseInt(splitter) < 0 || parseInt(splitter) > 255) {
                    isIP = false;
                    break;
                }
            }
        }

        let baseHost = null;
        if (isIP) {
            baseHost = hostname;
        } else {
            const tld = ParserService.parseHost(hostname);
            if (tld) {
                baseHost = tld.domain;
            }
        }

        let returnURL = "";
        if (!ignoreProtocol) {
            returnURL += protocol + "//";
        }

        if (!ignoreSubdomain) {
            returnURL += hostname;
        } else {
            returnURL += baseHost;  //return the hostname and the tld of the website if ignoreSubdomain is true
        }

        if (ignorePort) {
            if (port) {
                returnURL = returnURL.replace(':' + port, '');
            }
        } else if (port) {
            returnURL += ':' + port;
        }

        if (!ignorePath && pathname) {
            returnURL += pathname;
        }
        if (returnURL.slice(-1) === "/") {
            returnURL = returnURL.slice(0, -1);
        }
        return returnURL;
    }

    public static parseUrl = (url: string | URL) => {
        if (typeof url === "string") {
            url = new URL(url);
        }
        const { hostname, pathname, port, protocol } = url as URL;

        return {
            hostname,
            port: port ? parseInt(port) : undefined,
            protocol,
            pathname: pathname
        };
    };

    public static parseHost = (hostname: string) => {
        /** global: tlds */
        if (typeof tlds === "undefined") {
            throw new Error('No TLDs!');
        }

        let parts = hostname.split(".");
        let stack = "";
        let tld_level = 1;  // unknown tld is always 1st level

        //for (let i = 0; i < parts.length; i++) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            stack = stack ? stack + "." + part : part;
            if (!ParserService.nameIsInTlds(stack)) {
                break;
            }
            //tld_level = i + 1;
            tld_level = parts.length - i;
        }

        if (parts.length <= tld_level) {
            return {
                tld: null,
                domain: hostname
            };
        } else {
            return {
                tld: parts.slice(-tld_level).join('.'),
                domain: parts.slice(-tld_level - 1).join('.'),
                sub: parts.slice(0, (-tld_level - 1)).join('.'),
            };
        }
    }

    public static nameIsInTlds = (name: string, allowPrivate = true): boolean => {
        if (allowPrivate) {
            return tlds.icann.includes(name) || tlds.private.includes(name);
        }
        return tlds.icann.includes(name);
    }
}
