/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */
API.notifications = {
    create: function(title, message){
        var opt = {
            type: "basic",
            title: title,
            message: message,
            iconUrl: "icons/icon32.png"
        };
        return API.api.notifications.create('PiCast', opt, function(id) { console.log("Last error:", chrome.runtime.lastError); });
    },
    update: API.api.notifications.update,
    clear: API.api.notifications.clear,

    getAll: function () {
        if (API.promise) {
            return API.api.notifications.getAll(details);
        }
        else {
            return new C_Promise(function () {
                API.api.notifications.getAll(details, (function (notifications) {
                    this.call_then(notifications);
                }).bind(this));
            });
        }
    },
    /**
     * Event handlers from now on
     */
    onClosed: API.api.notifications.onClosed,
    onClicked: API.api.notifications.onClicked,
    onButtonClicked: API.api.notifications.onButtonClicked,

};