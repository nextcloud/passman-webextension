import { notyError, notySuccess } from "~services/NotyService";

export default class ClipboardService {
    public static copyToClipboard = (value: string, fieldTitle: string) => {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            notySuccess(fieldTitle + ' copied to clipboard');
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            notyError('Failed to copy ' + fieldTitle);
        });
    }
}
