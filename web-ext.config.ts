import { defineWebExtConfig } from "wxt";

/**
 * dev mode persistence does not work for firefox yet, but nice try so far :D
 */
export default defineWebExtConfig({
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
    firefoxArgs: ['--firefox-profile=wxt-passman-wxt-v3', '--keep-profile-changes', '--profile-create-if-missing']
});
