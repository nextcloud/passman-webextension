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

    var protocol = URLobj.scheme;
    var host = URLobj.host;
    var path = URLobj.path;
    var port = URLobj.port;

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
        var result = host.match(/[^./]+\.[^./]+$/);
        var TLDlength = 0;
        if(result){
            TLDlength = result[0].length; //@TODO get the tld length from URLobj
        }

        baseHost = splittedURL.slice(-TLDlength - 1).join(".");
    }
    var returnURL = "";
    if (!ignoreProtocol) {
        returnURL += protocol + "://";
    }
    if (!ignoreSubdomain) {
        returnURL += host;
    }
    else {
        returnURL += baseHost;
    }
    if (ignorePort) {
        returnURL = returnURL.replace(':' + port, "");
    }
    if (!ignorePath && path !== null && path) {
        returnURL += path;
    }
    if (returnURL.slice(-1) === "/") {
        returnURL = returnURL.slice(0, -1);
    }
    return returnURL;
}