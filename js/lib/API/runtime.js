/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global API */

'use strict';
API.runtime = {
    getBackgroundPage: function() {
        if (API.promise) {
            return API.api.runtime.getBackgroundPage();
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.getBackgroundPage((function(backgroundPage){
                    this.call_then(backgroundPage);
                }).bind(this));
            });
        }
    },
    openOptionsPage: function() {
        if (API.promise) {
            return API.api.runtime.openOptionsPage();
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.openOptionsPage((function() {
                    this.call_then();
                }).bind(this));
            });
        }
    },
    getManifest: function() {
        return API.api.runtime.getManifest();
    },
    getURL: function(url) {
        return API.api.runtime.getURL(url);
    },
    setUninstallURL: function(url) {
        if (API.promise) {
            return API.api.runtime.setUninstallURL(url);
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.setUninstallURL(url, function() {
                    if (typeof API.api.runtime.lastError !== "undefined") {
                        this.call_error(API.api.runtime.lastError);
                        return;
                    }
                    this.call_then();
                });
            });
        }
    },
    reload: function() {
        API.api.runtime.reload();
    },
    requestUpdateCheck: function() {
        if (API.promise) {
            return API.api.runtime.requestUpdateCheck();
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.requestUpdateCheck((function(status, details) {
                    this.call_then(status, details);
                }).bind(this));
            });
        }
    },
    restart: function() {
        if ( ! API.promise) {
            API.api.runtime.restart();
        }
    },
    connect: function(extensionId, connectionInfo) {
        return API.api.runtime.connect(extensionId, connectionInfo);
    },
    connectNative: function(application) {
        return API.api.runtime.connectNative(application);
    },
    sendMessage: function(extensionId, message, options) {
        if (API.promise) {
            return API.api.runtime.sendMessage(extensionId, message, options);
        }
        else {
            return new C_Promise(function(){
                API.api.runtime.sendMessage(message, options, (function(response) {
                    this.call_then(response);
                }).bind(this));
            });
        }
    },
    sendNativeMessage: function(application, message) {
        if (API.promise) {
            return API.api.runtime.sendNativeMessage(application, message);
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.sendNativeMessage(application, message, (function(response) {
                    this.call_then(response);
                }).bind(this));
            });
        }
    },
    getPlatformInfo: function() {
        if (API.promise) {
            return API.api.runtime.getPlatformInfo();
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.getPlatformInfo((function(info) {
                    this.call_then(info);
                }).bind(this));
            });
        }
    },
    getBrowserInfo: function() {
        if (API.promise) {
            return API.api.runtime.getBrowserInfo();
        }
        else {
            return new C_Promise(function() {
                //  Not implemented in chrome
                this.call_then(null);
            });
        }
    },
    getPackageDirectoryEntry: function() {
        if (API.promise) {
            return API.api.runtime.getPackageDirectoryEntry();
        }
        else {
            return new C_Promise(function() {
                API.api.runtime.getPackageDirectoryEntry((function(directoryEntry) {
                    this.call_then(directoryEntry);
                }).bind(this));
            });
        }
    },

    id: API.api.runtime.id,
    
    /**
     * Events from now on!
     */
    onStartup: API.api.runtime.onStartup,
    onInstalled: API.api.runtime.onInstalled,
    onSuspend: API.api.runtime.onSuspend,
    onSuspendCanceled: API.api.runtime.onSuspendCanceled,
    onUpdateAvailable: API.api.runtime.onUpdateAvailable,
    onBrowserUpdateAvailable: API.api.runtime.onBrowserUpdateAvailable,
    onConnect: API.api.runtime.onConnect,
    onConnectExternal: API.api.runtime.onConnectExternal,
    onMessage: API.api.runtime.onMessage,
    onMessageExternal: API.api.runtime.onMessageExternal,
    onRestartRequired: API.api.runtime.onRestartRequired
};