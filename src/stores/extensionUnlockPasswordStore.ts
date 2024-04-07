import { writable } from 'svelte/store';

// holds the extension unlock password while in popup open state
// todo: will be gone when closing the popup; longer living solution required
const extensionUnlockPasswordStore = writable<string>();
export default extensionUnlockPasswordStore;
