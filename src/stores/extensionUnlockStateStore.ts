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

// holds the extension unlock state during popup is open
const extensionUnlockStateStore = writable<ExtensionUnlockState>();
export default extensionUnlockStateStore;
