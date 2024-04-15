import toast, { type ToastOptions } from 'svelte-french-toast/dist/index';
import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";

const notyOptions: ToastOptions = {
    position: "bottom-left"
};

export const notySuccess = (msg: string) => toast.success(msg, notyOptions);
export const notyError = (msg: string) => toast.error(msg, notyOptions);

export const notyFormFieldErrors = (errors: IFormFieldError[]) => {
    errors.forEach((error: IFormFieldError) => notyError(error.error));
};
