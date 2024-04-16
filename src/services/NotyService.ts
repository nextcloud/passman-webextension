import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";
import type { ToastOptions } from "svelte-french-toast";
import toast from "svelte-french-toast/dist/core/toast";

const notyOptions: ToastOptions = {
    position: "bottom-left"
};

export default class NotyService {
    public static notySuccess = (msg: string) => toast.success(msg, notyOptions);
    public static notyError = (msg: string) => toast.error(msg, notyOptions);

    public static notyFormFieldErrors = (errors: IFormFieldError[]) => {
        errors.forEach((error: IFormFieldError) => NotyService.notyError(error.error));
    };
}
