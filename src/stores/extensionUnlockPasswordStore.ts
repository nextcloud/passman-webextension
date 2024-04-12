import { writable } from 'svelte/store';

export enum ExtensionUnlockPasswordValidationState {
    NOT_SET_UP_YET,
    VALIDATION_FAILED,
    VALIDATION_SUCCEEDED,
}

export enum ExtensionUnlockState {
    NOT_SET_UP_YET,
    LOCKED,
    UNLOCKED,
}

// holds the extension unlock password while in popup open state
// todo: will be gone when closing the popup; longer living solution required
const extensionUnlockPasswordStore = writable<string>();
export default extensionUnlockPasswordStore;
