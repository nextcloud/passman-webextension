import browser from "webextension-polyfill";

export const i18n = browser.i18n;

export const getMessage = (key: string, substitutions?: string | string[]) => {
    return browser.i18n.getMessage(key, substitutions);
};
