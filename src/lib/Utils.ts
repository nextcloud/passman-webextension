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
        // Must test "this" window, not "is any popup open".
        // Options + open popup would otherwise both report true.
        try {
            const popupViews = browser?.extension?.getViews?.({ type: "popup" }) ?? [];
            if (popupViews.includes(window)) {
                return true;
            }
        } catch {
            // ignore
        }

        // Vivaldi: getViews({ type: "popup" }) is often empty even inside the popup
        return location.pathname.includes('/popup.html');
    };
    public static titleCase = (s: string) => {
        return s.split(' ')
            .map(word =>
                word.split('-')
                    .map(subword =>
                        subword.charAt(0).toUpperCase() + subword.slice(1)
                    )
                    .join('-')
            )
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
