import { DefaultLoggingService } from "@binsky/passman-client-ts/lib/Service/DefaultLoggingService";
import NotyService from "../../services/frontend/NotyService";

export class CustomPassmanClientLoggingService extends DefaultLoggingService {
    onSuccess(message: string): void {
        super.onSuccess(message);
        NotyService.notySuccess(message);
    }

    onError(message: string): void {
        super.onError(message);
        NotyService.notyError(message);
    }
}
