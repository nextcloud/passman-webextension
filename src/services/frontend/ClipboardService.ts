import NotyService from "../../services/frontend/NotyService";
import { i18n } from "~/lib/i18n";

export default class ClipboardService {

    /**
     * Copy value to clipboard and create a NotyService notification on success or failure.
     * @param value
     * @param fieldTitle
     */
    public static copyToClipboardWithNotification = (value: string, fieldTitle: string) => {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            NotyService.notySuccess(i18n.getMessage('field_copied_to_clipboard', [fieldTitle]));
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            NotyService.notyError(i18n.getMessage('failed_to_copy_field', [fieldTitle]));
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
