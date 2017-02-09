function getLoginFields() {
    var fieldPairs = [],
        pswd = (function(){
            var inputs = document.getElementsByTagName("input"),
                len = inputs.length,
                ret = [];
            while (len--) {
                if (inputs[len].type === "password") {
                    ret[ret.length] = inputs[len];
                }
            }
            return ret;
        }()),
        pswdLength = pswd.length,
        parentForm = function(elem) {
            while (elem.parentNode) {
                if(elem.parentNode.nodeName.toLowerCase() === "form") {
                    return elem.parentNode;
                }
                elem = elem.parentNode;
            }
        };
    while (pswdLength--) {
        var curPswdField = pswd[pswdLength],
            thisParentForm = parentForm(curPswdField);
        if (thisParentForm) {
            var inputs = thisParentForm.getElementsByTagName("input");
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i] !== curPswdField && (inputs[i].type === "text" || inputs[i].type === "email")) {
                    fieldPairs[fieldPairs.length] = [inputs[i], curPswdField];
                    break;
                }
            }
        }
    }
    return fieldPairs;
}

function getFormFromElement(elem){
    while (elem.parentNode) {
        if(elem.parentNode.nodeName.toLowerCase() === "form") {
            return elem.parentNode;
        }
        elem = elem.parentNode;
    }
}

function fillPassword(user, password) {
    var loginFields = getLoginFields();
    for (var i=0; i<loginFields.length; i++) {
        loginFields[i][0].value = user;
        loginFields[i][1].value = password;
    }
}