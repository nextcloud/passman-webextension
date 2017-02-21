/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */

API.webRequest = {

    /**
     * Event handlers from now on
     */
    onBeforeRequest: API.api.webRequest.onBeforeRequest,
    onBeforeSendHeaders: API.api.webRequest.onBeforeSendHeaders,
    onSendHeaders: API.api.webRequest.onSendHeaders,
    onHeadersReceived: API.api.webRequest.onHeadersReceived,
    onAuthRequired: API.api.webRequest.onAuthRequired,
    onResponseStarted: API.api.webRequest.onResponseStarted,
    onBeforeRedirect: API.api.webRequest.onBeforeRedirect,
    onCompleted: API.api.webRequest.onCompleted,
    onErrorOccurred: API.api.webRequest.onErrorOccurred
};