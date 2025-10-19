import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";
import { toast } from "svelte-sonner";

export default class NotyService {
    public static notySuccess = (msg: string) => toast.success(msg);
    public static notyError = (msg: string) => toast.error(msg);

    public static notyFormFieldErrors = (errors: IFormFieldError[]) => {
        errors.forEach((error: IFormFieldError) => NotyService.notyError(error.error));
    };
}
