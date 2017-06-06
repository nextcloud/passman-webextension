function processURL(URL, ignoreProtocol, ignoreSubdomain, ignorePath, ignorePort) {
    if (URL === null || URL === "") {
        return URL;
    }

    var URLobj = null;
    try {
        URLobj = new window.URL(URL);
    }

    catch (err) {
        if (ignoreProtocol) {
            try {
                URLobj = new window.URL("http://" + URL);
            }
            catch (err2) {
                return URL;
            }
        }
        else {
            return URL;
        }
    }

    var parser = document.createElement('a');
    parser.href = URL;


    var protocol = parser.protocol;
    var host = parser.hostname;
    var path = parser.pathname;
    var port = parser.port;
    if (host === null || host === "") {
        return URL;
    }

    var splittedURL = host.split(".");
    var isIP = false;
    if (splittedURL.length === 4) {
        isIP = true;
        for (var i = 0; i < splittedURL.length; i++) {
            if (isNaN(splittedURL[i]) || splittedURL[i] < 0 || splittedURL[i] > 255) {
                isIP = false;
                break;
            }
        }
    }
    var baseHost = null;
    if (isIP) {
        baseHost = host;
    }
    else {
        var result = host.match(/[^./]+\.[^./]+$/); // catch the two last parts, it's de hostname and the tld
        //@TODO Implement known list of TLDs
        //@url https://github.com/131/node-tld/blob/master/effective_tld_names.json

        if(result) {
            baseHost = result[0];
        } else {
            baseHost = host;
        }
    }
    var returnURL = "";
    if (!ignoreProtocol) {
        returnURL += protocol + "//";
    }

    if (!ignoreSubdomain) {
        returnURL += host;
    }
    else {
        returnURL += baseHost;//return the hostname and the tld of the website if ignoreSubdomain is check
    }

    if (ignorePort) {
        if (port) {
            returnURL = returnURL.replace(':' + port, '');
        }
    } else {
        if (port) {
            returnURL += ':' + port;
        }
    }

    if (!ignorePath && path !== null && path) {
        returnURL += path;
    }
    if (returnURL.slice(-1) === "/") {
        returnURL = returnURL.slice(0, -1);
    }
    return returnURL;
}
