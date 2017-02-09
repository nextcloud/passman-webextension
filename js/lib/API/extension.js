/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */

API.extension = {
    getURL: function(path) {
        return API.api.extension.getURL(path);
    },
    getViews: function(fetchProperties) {
        return API.api.extension.getViews(fetchProperties);
    },
    getBackgroundPage: function() {
        return API.api.extension.getBackgroundPage();
    },
    isAllowedIncognitoAccess: function() {
        if (API.promise) {
            return API.extension.isAllowedIncognitoAccess();
        }
        else {
            return new C_Promise(function(){
                API.extension.isAllowedIncognitoAccess((function(data){
                    this.call_then(data);
                }).bind(this));
            });
        }
    },
    isAllowedFileSchemeAccess: function() {
        if (API.promise) {
            return API.api.extension.isAllowedFileSchemeAccess();
        }
        else {
            return new C_Promise(function(){
                API.api.extension.isAllowedFileSchemeAccess((function(data){
                    this.call_then(data);
                }).bind(this));
            });
        }
    },
    setUpdateUrlData: function(data) {
        API.extension.setUpdateUrlData(data);
    },
    
    
    /**
     * Event handlers from now on
     */
    onRequest: API.api.extension.onRequest,
    onRequestExternal: API.api.extension.onRequestExternal
};