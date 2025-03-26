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
        return (typeof chrome != undefined && chrome.extension) ?
            chrome.extension.getViews({ type: "popup" }).length > 0 : null;
    };
}

export enum CREDENTIAL_EDIT_SECTIONS {
    GENERAL,
    PASSWORD,
    FILES,
    CUSTOM_FIELDS,
    OTP
}
