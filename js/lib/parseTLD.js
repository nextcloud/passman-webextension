var parse_host = function(host){
    if(!tlds){
        throw new Error('No TLDs!');
    }

    var parts = host.split(".");
    var stack = "";
    var tld_level = 1; //unknown tld are 1st level
    for(var i=parts.length-1, part;i>=0;i--){
        part = parts[i];
        stack = stack ? part + "." + stack : part;
        if(!tlds[stack]){
            break;
        }
        tld_level = tlds[stack];
    }
    if(parts.length <= tld_level ) {
        return {
            tld: null,
            domain: host
        };
    } else {
        return  {
            tld     : parts.slice(-tld_level).join('.'),
            domain  : parts.slice(-tld_level-1).join('.'),
            sub     : parts.slice(0, (-tld_level-1)).join('.'),
        };
    }


};