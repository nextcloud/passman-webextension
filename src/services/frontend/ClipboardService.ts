import NotyService from "~services/frontend/NotyService";

export default class ClipboardService {
    public static copyToClipboard = (value: string, fieldTitle: string) => {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            NotyService.notySuccess(fieldTitle + ' copied to clipboard');
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            NotyService.notyError('Failed to copy ' + fieldTitle);
        });
    }
}
