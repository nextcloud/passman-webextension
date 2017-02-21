/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */

API.tabs = {
    connect: function(tabId, connectInfo) {
        return API.api.tabs.connect(tabId, connectInfo);
    },
    create: function(parameters) {
        if (API.promise) {
            return API.api.tabs.create(parameters);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.create(parameters, (function (tab) {
                    this.call_then(tab);
                }).bind(this));
            });
        }
    },
    captureVisibleTab: function(windowId, options) {
        if (API.promise) {
            return API.api.tabs.captureVisibleTab(windowId,  options);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.captureVisibleTab(windowId,  options, (function(dataUrl) {
                    this.call_then(dataUrl);
                }).bind(this));
            });
        }
    },
    detectLanguage: function(tabId) {
        if (API.promise) {
            return API.api.tabs.detectLanguage(tabId);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.detectLanguage(tabId, (function(language) {
                    this.call_then(language);
                }).bind(this));
            });
        }
    },
    duplicate: function(tabId) {
        if (API.promise) {
            return API.api.tabs.duplicate(tabId);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.duplicate(tabId, (function(tab) {
                    this.call_then(tab);
                }).bind(this));
            });
        }
    },
    executeScript: function(tabId, details) {
        if (API.promise) {
            return API.api.tabs.executeScript(tabId, details);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.executeScript(tabId, details, (function(result) {
                    this.call_then(result);
                }).bind(this));
            });
        }
    },
    get: function(tabId) {
        if (API.promise) {
            return API.api.tabs.get(tabId);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.get(tabId, (function(tab) {
                    this.call_then(tab);
                }).bind(this));
            });
        }
    },
    getCurrent: function() {
        if (API.promise) {
            return API.api.tabs.getCurrent();
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.getCurrent((function(tab) {
                    this.call_then(tab);
                }).bind(this));
            });
        }
    },
    getZoom: function(tabId) {
        if (API.promise) {
            return API.api.tabs.getZoom(tabId);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.getZoom(tabId, (function(zoom) {
                    this.call_then(zoom);
                }).bind(this));
            });
        }
    },
    getZoomSettings: function(tabId) {
        if (API.promise) {
            return API.api.tabs.getZoomSettings(tabId);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.getZoomSettings(tabId, (function(setting) {
                    this.call_then(setting);
                }).bind(this));
            });
        }
    },
    highlight: function(highlightInfo) {
        if (API.promise) {
            return new C_Promise(function() {
                this.call_then();   // Firefox seems to not support this
            });
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.highlight(highlightInfo, (function(window) {
                    this.call_then(window);
                }).bind(this));
            });
        }
    },
    insertCSS: function(tabId, details) {
        if (API.promise) {
            return API.api.tabs.insertCSS(tabId, details);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.insertCSS(tabId, details, (function() {
                    this.call_then();
                }).bind(this));
            });
        }
    },
    removeCSS: function(tabId, details) {
        if (API.promise) {
            return API.api.tabs.removeCSS(tabId, details);
        }
        else {
            return new C_Promise(function() {
                this.call_then();   // Not supported by chrome
            });
        }
    },
    move: function(tabIds, moveProperties) {
        if (API.promise) {
            return API.api.tabs.move(tabIds, moveProperties);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.move(tabIds, moveProperties, (function(tabs) {
                    this.call_then(tabs);
                }).bind(this));
            });
        }
    },
    query: function(queryInfo) {
        if (API.promise) {
            return API.api.tabs.query(queryInfo);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.query(queryInfo, (function(tabs) {
                    this.call_then(tabs);
                }).bind(this));
            });
        }
    },
    reload: function(tabId, reloadProperties) {
        if (API.promise) {
            return API.api.tabs.reload(tabId, reloadProperties);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.reload(tabId, reloadProperties, (function() {
                    this.call_then();
                }).bind(this));
            });
        }
    },
    remove: function(tabIds) {
        if (API.promise) {
            return API.api.tabs.remove(tabIds);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.remove(tabIds, (function() {
                    this.call_then();
                }).bind(this));
            });
        }
    },
    sendMessage: function(tabId, message, options) {
        if (API.promise) {
            return API.api.tabs.sendMessage(tabId, message, options);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.sendMessage(tabId, message, options, (function(response) {
                    this.call_then(response);
                }).bind(this));
            });
        }
    },
    setZoom: function(tabId, zoomFactor) {
        if (API.promise) {
            return API.api.tabs.setZoom(tabId, zoomFactor);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.setZoom(tabId, zoomFactor, (function() {
                    this.call_then();
                }).bind(this));
            });
        }
    },
    update: function(tabId, updateProperties) {
        if (API.promise) {
            return API.api.tabs.update(tabId, updateProperties);
        }
        else {
            return new C_Promise(function() {
                API.api.tabs.update(tabId, updateProperties, (function(tab) {
                    this.call_then(tab);
                }).bind(this));
            });
        }
    },
    
    
    
    
    /**
     * Events from now on
     */
    onActivated: API.api.tabs.onActivated,
    onAttached: API.api.tabs.onAttached,
    onCreated: API.api.tabs.onCreated,
    onDetached: API.api.tabs.onDetached,
    onHighlighted: API.api.tabs.onHighlighted,
    onMoved: API.api.tabs.onMoved,
    onRemoved: API.api.tabs.onRemoved,
    onReplaced: API.api.tabs.onReplaced,
    onUpdated: API.api.tabs.onUpdated,
    onZoomChange: API.api.tabs.onZoomChange
};