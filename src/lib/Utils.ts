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
}

export enum CREDENTIAL_EDIT_SECTIONS {
    GENERAL,
    PASSWORD,
    FILES,
    CUSTOM_FIELDS,
    OTP
}
