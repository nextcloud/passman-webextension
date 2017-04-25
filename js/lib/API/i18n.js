/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */
API.i18n = {
    getAcceptLanguages: function() {
        if (API.promise) {
            return API.api.i18n.getAcceptLanguages();
        }
        else {
            return new C_Promise(function(){
                API.extension.getAcceptLanguages((function(data){
                    this.call_then(data);
                }).bind(this));
            });
        }
    },
    detectLanguage: function() {
        if (API.promise) {
            return API.api.i18n.detectLanguage();
        }
        else {
            return new C_Promise(function(){
                API.api.i18n.detectLanguage((function(isReliable, languages){
                    this.call_then(isReliable, languages);
                }).bind(this));
            });
        }
    },
    getMessage: API.api.i18n.getMessage,
    getUILanguage: API.api.i18n.getUILanguage

};