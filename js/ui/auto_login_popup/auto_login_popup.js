$(document).ready(function () {
    API.runtime.onMessage.addListener(function (msg) {
        var $container = $('.container');
        $container.fadeIn();

        //console.log('Method call', msg.method);
        if (msg.hasOwnProperty('setIframeUsername')) {
            var text = API.i18n.getMessage('auto_login', [msg.setIframeUsername]);
            $container.text(text);
        }
    });
});