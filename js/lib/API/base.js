/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global browser, chrome */

'use strict';
if (typeof API === "undefined") {
    var API = {};
}

API.api;
API.promise = true;     // Chrome does not return promises

// Workaround chrome's uniqueness
if (typeof browser === 'undefined') {
    API.api = chrome;
    API.promise = false;
}
else{
    API.api = browser;
}