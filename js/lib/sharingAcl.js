function SharingACL (acl_permission) {
    this.permission = acl_permission;
}

SharingACL.prototype.permissions = {
    READ: 0x01,
    WRITE: 0x02,
    FILES: 0x04,
    HISTORY: 0x08,
    OWNER: 0x80,
};
/**
 * Checks if a user has the given permission/s
 * @param permission
 * @returns {boolean}
 */
SharingACL.prototype.hasPermission = function (permission) {
    return permission === (this.permission & permission);
};

/**
 * Adds a permission to a user, leaving any other permissions intact
 * @param permission
 */
SharingACL.prototype.addPermission = function (permission) {
    this.permission = this.permission | permission;
};

/**
 * Removes a given permission from the item, leaving any other intact
 * @param permission
 */
SharingACL.prototype.removePermission = function (permission) {
    this.permission = this.permission & ~permission;
};

SharingACL.prototype.togglePermission = function (permission) {
    this.permission ^= permission;
};

SharingACL.prototype.getAccessLevel = function () {
    return this.permission;
};