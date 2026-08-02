import type { ModelStoreInterface } from "@binsky/passman-client-ts/lib/Interfaces/ModelStoreInterface";
import type { GenericVaultInformationFromServerInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/GenericVaultInformationFromServerInterface";
import type { SerializableTransferFullVaultInterface } from "@binsky/passman-client-ts/lib/Interfaces/Vault/SerializableTransferFullVaultInterface";
import type { SerializableTransferCredentialInterface } from "@binsky/passman-client-ts/lib/Interfaces/Credential/SerializableTransferCredentialInterface";
import {
    isIndexedDbMutationDenied,
    isIndexedDbQuotaExceeded,
} from "@binsky/passman-client-ts/lib/Service/IndexedDbModelStore";
import OfflineCacheStorageService from "~/services/OfflineCacheStorageService";
import { logger } from "~/services/ConsoleLoggingService";
import ExtensionUnlockService from "./ExtensionUnlockService";

/**
 * Wraps a model store and turns IndexedDB policy/quota failures into session notices + soft-failed writes
 * so setup/login is not killed by a raw DOMException.
 */
export default class NotifyingModelStore implements ModelStoreInterface {
    constructor(private readonly inner: ModelStoreInterface) {}

    private async handleError(error: unknown, softFail: boolean): Promise<boolean> {
        if (isIndexedDbMutationDenied(error)) {
            // Enqueue only when the extension is finally set up and ready to use, otherwise it would feel inconsistent and noisy.
            // This way it should only "sticky" notify on unexpected state changes.
            // Since setup and settings UI should gatekeep / early detect potential IDB access problems, we should not need that hardfail fallback for now.
            if (await ExtensionUnlockService.isSetupDone()) {
                await OfflineCacheStorageService.enqueueNotice(
                    "unavailable",
                    error instanceof Error ? error.message : undefined
                );
            }
            logger.warn("[NotifyingModelStore] IndexedDB mutations denied", error);
            return softFail;
        }
        if (isIndexedDbQuotaExceeded(error)) {
            if (await ExtensionUnlockService.isSetupDone()) {
                await OfflineCacheStorageService.enqueueNotice(
                    "quota",
                    error instanceof Error ? error.message : undefined
                );
            }
            logger.warn("[NotifyingModelStore] IndexedDB quota exceeded", error);
            return softFail;
        }
        return false;
    }

    private async write(op: () => Promise<void>): Promise<void> {
        try {
            await op();
        } catch (error) {
            if (await this.handleError(error, true)) {
                return;
            }
            throw error;
        }
    }

    private async read<T>(op: () => Promise<T>): Promise<T | undefined> {
        try {
            return await op();
        } catch (error) {
            if (await this.handleError(error, true)) {
                return undefined;
            }
            throw error;
        }
    }

    getVaultList(connectionId: string) {
        return this.read(() => this.inner.getVaultList(connectionId));
    }

    putVaultList(connectionId: string, vaultList: GenericVaultInformationFromServerInterface[]) {
        return this.write(() => this.inner.putVaultList(connectionId, vaultList));
    }

    getVault(connectionId: string, guid: string) {
        return this.read(() => this.inner.getVault(connectionId, guid));
    }

    putVault(connectionId: string, vault: SerializableTransferFullVaultInterface) {
        return this.write(() => this.inner.putVault(connectionId, vault));
    }

    deleteVault(connectionId: string, guid: string) {
        return this.write(() => this.inner.deleteVault(connectionId, guid));
    }

    getCredential(connectionId: string, vaultGuid: string, credentialGuid: string) {
        return this.read(() => this.inner.getCredential(connectionId, vaultGuid, credentialGuid));
    }

    putCredential(connectionId: string, vaultGuid: string, credential: SerializableTransferCredentialInterface) {
        return this.write(() => this.inner.putCredential(connectionId, vaultGuid, credential));
    }

    deleteCredential(connectionId: string, vaultGuid: string, credentialGuid: string) {
        return this.write(() => this.inner.deleteCredential(connectionId, vaultGuid, credentialGuid));
    }
}
