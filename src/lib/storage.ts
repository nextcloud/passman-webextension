import browser from "webextension-polyfill";

export class Storage {
    private namespace = "";

    constructor(private area: "local" | "sync" | "session" = "local", namespace?: string) {
        if (namespace) {
            this.namespace = namespace;
        }
    }

    /**
     * Sets or updates the current namespace.
     */
    public setNamespace(namespace: string) {
        this.namespace = namespace;
    }

    /**
     * Prefixes a key with the current namespace.
     */
    private getKey(key: string): string {
        return this.namespace ? `${this.namespace}:${key}` : key;
    }

    async get<T = any>(key: string): Promise<T | undefined> {
        if (!browser.storage[this.area]) {
            throw new Error(`Storage area "${this.area}" is not available. Make sure the "storage" permission is declared in the manifest.`);
        }
        const res = await browser.storage[this.area].get(this.getKey(key));
        return (res[this.getKey(key)] as T) ?? undefined;
    }

    async set(key: string, value: any) {
        if (!browser.storage[this.area]) {
            throw new Error(`Storage area "${this.area}" is not available. Make sure the "storage" permission is declared in the manifest.`);
        }
        await browser.storage[this.area].set({ [this.getKey(key)]: value });
    }

    async remove(key: string) {
        if (!browser.storage[this.area]) {
            throw new Error(`Storage area "${this.area}" is not available. Make sure the "storage" permission is declared in the manifest.`);
        }
        await browser.storage[this.area].remove(this.getKey(key));
    }

    async clear() {
        if (!browser.storage[this.area]) {
            throw new Error(`Storage area "${this.area}" is not available. Make sure the "storage" permission is declared in the manifest.`);
        }
        await browser.storage[this.area].clear();
    }

    /**
     * Returns all key-value pairs within the namespace.
     */
    async getAll<T = any>(): Promise<Record<string, T>> {
        if (!browser.storage[this.area]) {
            throw new Error(`Storage area "${this.area}" is not available. Make sure the "storage" permission is declared in the manifest.`);
        }
        const all = await browser.storage[this.area].get(null);
        const entries = Object.entries(all)
            .filter(([key]) => !this.namespace || key.startsWith(`${this.namespace}:`))
            .map(([key, value]) => [
                this.namespace ? key.replace(`${this.namespace}:`, "") : key,
                value,
            ]);
        return Object.fromEntries(entries);
    }
}
