function fillPassword(user, password) {
    if(user){
        document.querySelectorAll('input[type=text], input[type=email]').forEach(function(x){x.value=user;});
    }
    if(password) {
        document.querySelectorAll('input[type=password]').forEach(function(x){ x.value=password;});
    }
}
