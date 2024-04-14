export default class ClipboardService {
    public static copyToClipboard = (value: string, fieldTitle: string) => {
        navigator.clipboard.writeText(value).then(() => {
            /* Resolved - text copied to clipboard successfully */
            //console.log(fieldTitle + ' copied to clipboard');
            // todo: show notification
            //notyInfo(fieldTitle + ' copied to clipboard');
        }, () => {
            /* Rejected - text failed to copy to the clipboard */
            //console.error('Failed to copy ' + fieldTitle);
            // todo: show notification
            //notyError('Failed to copy ' + fieldTitle);
        });
    }
}
