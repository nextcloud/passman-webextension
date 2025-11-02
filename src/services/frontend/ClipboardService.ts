import NotyService from "../../services/frontend/NotyService";

export default class ClipboardService {

    /**
     * Copy value to clipboard and create a NotyService notification on success or failure.
     * @param value
     * @param fieldTitle
     */
    public static copyToClipboardWithNotification = (value: string, fieldTitle: string) => {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            NotyService.notySuccess(fieldTitle + ' copied to clipboard');
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            NotyService.notyError('Failed to copy ' + fieldTitle);
        });
    }

    /**
     * Copy value to clipboard without any notification or error handling.
     * @param value
     */
    public static copyToClipboard = (value: string) => {
        navigator.clipboard.writeText(value).then(() => {
        });
    }
}
