/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */

API.cookies = {
    get: function (details) {
        if (API.promise) {
            return API.api.cookies.get(details);
        }
        else {
            return new C_Promise(function () {
                API.api.cookies.get(details, (function (cookie) {
                    this.call_then(cookie);
                }).bind(this));
            });
        }
    },
    getAll: function (details) {
        if (API.promise) {
            return API.api.cookies.getAll(details);
        }
        else {
            return new C_Promise(function () {
                API.api.cookies.getAll(details, (function (cookie) {
                    this.call_then(cookie);
                }).bind(this));
            });
        }
    },
    set: function (details) {
        if (API.promise) {
            return API.api.cookies.set(details);
        }
        else {
            return new C_Promise(function () {
                API.api.cookies.set(details, (function (cookie) {
                    this.call_then(cookie);
                }).bind(this));
            });
        }
    },
    remove: function (details) {
        if (API.promise) {
            return API.api.cookies.remove(details);
        }
        else {
            return new C_Promise(function () {
                API.api.cookies.remove(details, (function (cookie) {
                    this.call_then(cookie);
                }).bind(this));
            });
        }
    },
    getAllCookieStores: function (details) {
        if (API.promise) {
            return API.api.cookies.getAllCookieStores(details);
        }
        else {
            return new C_Promise(function () {
                API.api.cookies.getAllCookieStores(details, (function (cookie) {
                    this.call_then(cookie);
                }).bind(this));
            });
        }
    }
};