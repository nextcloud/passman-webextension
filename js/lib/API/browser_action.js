/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */
'use strict';

API.browserAction = {
    setTitle: API.api.browserAction.setTitle,
    getTitle: function(details) {
        if (API.promise) {
            return API.api.browserAction.getTitle(details);
        }
        else {
            return new C_Promise(function() {
                API.api.browserAction.getTitle(details, (function(title) {
                    this.call_then(title);
                }).bind(this));
            });
        }
    },
    setIcon: function(details) {
        if (API.promise) {
            return API.api.browserAction.setIcon(details);
        }
        else {
            return new API.api.browserAction.setIcon(details, (function(){  
                this.call_then();
            }).bind(this));
        }
    },
    setPopup: API.api.browserAction.setPopup,
    getPopup: function(details) {
        if (API.promise) {
            return API.api.browserAction.getPopup(details);
        }
        else {
            return new C_Promise(function() {
                API.api.browserAction.getPopup(details, (function(url) {
                    this.call_then(url);
                }).bind(this));
            });
        }
    },
    setBadgeText: API.api.browserAction.setBadgeText,
    getBadgeText: function(details) {
        if (API.promise) {
            return API.api.browserAction.getBadgeText(details);
        }
        else {
            return new C_Promise(function() {
                API.api.browserAction.getBadgeText(details, (function(text) {
                    this.call_then(text);
                }).bind(this));
            });
        }
    },
    setBadgeBackgroundColor: API.api.browserAction.setBadgeBackgroundColor,
    getBadgeBackgroundColor: function(details) {
        if (API.promise) {
            return API.api.browserAction.getBadgeBackgroundColor(details);
        }
        else {
            return new C_Promise(function() {
                API.api.browserAction.getBadgeBackgroundColor(details, (function(colour) {
                    this.call_then(colour);
                }).bind(this));
            });
        }
    },
    enable: API.api.browserAction.enable,
    disable: API.api.browserAction.disable,
    
    /**
     * Events from now on
     */
    onClicked: API.api.browserAction.onClicked
};