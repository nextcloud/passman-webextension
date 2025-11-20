import browser from "webextension-polyfill";

export default class Utils {
    public static debounce = (func: (...args: any[]) => void, timeout = 300) => {
        let timer: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        };
    };
    public static isInPopup = () => {
        return (typeof browser != undefined && browser.extension) ?
            browser.extension.getViews({ type: "popup" }).length > 0 : null;
    };
    public static titleCase = (s: string) => {
        return s.toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
    }
}

export enum CREDENTIAL_EDIT_SECTIONS {
    GENERAL,
    PASSWORD,
    FILES,
    CUSTOM_FIELDS,
    OTP
}
