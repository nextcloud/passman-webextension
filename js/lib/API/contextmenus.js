/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global API */

API.contextMenus = {

    create: API.api.contextMenus.create,
    update: API.api.contextMenus.update,
    remove: API.api.contextMenus.remove,
    removeAll: API.api.contextMenus.removeAll,


    /**
     * Event handlers from now on
     */
    onClicked: API.api.contextMenus.onClicked
};