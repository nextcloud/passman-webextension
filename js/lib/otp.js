/* global sjcl */

window.OTP = (function () {
    function dec2hex(s) {
        return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
    }

    function hex2dec(s) {
        return parseInt(s, 16);
    }

    function base32tohex(base32) {
        if (!base32) {
            return;
        }
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
        var i;
        for (i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += leftpad(val.toString(2), 5, '0');
        }

        for (i = 0; i + 4 <= bits.length; i += 4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
        }
        return hex.length % 2 ? hex + "0" : hex;

    }

    function leftpad(str, len, pad) {
        if (len + 1 >= str.length) {
            str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }


    var _OTP = {
        secret: '',
        getOTP:  function () {
            if (!this.secret) {
                return;
            }
            var key = base32tohex(this.secret);
            var epoch = Math.round(new Date().getTime() / 1000.0);
            var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0');
            /** global: jsSHA */
            var hmacObj = new jsSHA(time, 'HEX');
            var hmac = hmacObj.getHMAC(key, 'HEX', 'SHA-1', "HEX");
            var offset = hex2dec(hmac.substring(hmac.length - 1));
            var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
            otp = (otp).substr(otp.length - 6, 6);
            return otp;
        }
    };
    return _OTP;
}());