$(document).ready(function () {
    API.runtime.onMessage.addListener(function (msg) {
        $('.container').show();
        //console.log('Method call', msg.method);
        if(msg.hasOwnProperty('setIframeUsername')){
            $('.username').text(msg.setIframeUsername);
        }
    });
});