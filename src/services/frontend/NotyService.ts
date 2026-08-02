import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";
import { addToast } from "@/spa_partials/Toaster.svelte";

export default class NotyService {
    public static readonly notyInfo = (message: string, title?: string) => addToast({
        message,
        title,
        type: "info"
    });
    public static readonly notySuccess = (message: string, title?: string) => addToast({
        message,
        title,
        type: "success"
    });
    public static readonly notyWarning = (message: string, title?: string) => addToast({
        message,
        title,
        type: "warning"
    });
    public static readonly notyError = (message: string, title?: string) => addToast({
        message,
        title,
        type: "error"
    });

    /** Sticky warning until the user dismisses it */
    public static readonly notyPinnedWarning = (message: string, title?: string) => addToast({
        message,
        title,
        type: "warning",
        duration: 0,
    });

    /** Sticky error until the user dismisses it */
    public static readonly notyPinnedError = (message: string, title?: string) => addToast({
        message,
        title,
        type: "error",
        duration: 0,
    });

    public static readonly notyFormFieldErrors = (errors: IFormFieldError[]) => {
        errors.forEach((error: IFormFieldError) => NotyService.notyError(error.error));
    };
}
