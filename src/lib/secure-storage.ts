import { Storage } from "./storage";

export class SecureStorage extends Storage {
    private cryptoKey: CryptoKey | null = null;

    constructor(area: "local" | "sync" | "session" = "local", private secret?: string, namespace?: string) {
        super(area, namespace);
    }

    /**
     * Set password / secret.
     * Reset internal cached key.
     */
    public setPassword(secret?: string) {
        this.secret = secret;
        this.cryptoKey = null;
    }

    get isPasswordSet(): boolean {
        return this.secret !== undefined;
    }

    private async getEncryptionKey(): Promise<CryptoKey> {
        if (this.cryptoKey) return this.cryptoKey;
        const enc = new TextEncoder().encode(this.secret);
        this.cryptoKey = await crypto.subtle.importKey(
            "raw",
            await crypto.subtle.digest("SHA-256", enc),
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );
        return this.cryptoKey;
    }

    async set(key: string, value: any) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(value));
        const cryptoKey = await this.getEncryptionKey();
        const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);
        const data = { iv: Array.from(iv), value: btoa(String.fromCharCode(...new Uint8Array(cipher))) };
        await super.set(key, data);
    }

    /**
     * @param key
     * @throws DOMException OperationError when trying to decrypt with an invalid key
     */
    async get<T>(key: string): Promise<T | undefined> {
        const data = await super.get<{ iv: number[]; value: string }>(key);
        if (!data) return undefined;
        const iv = new Uint8Array(data.iv);
        const bytes = Uint8Array.from(atob(data.value), c => c.charCodeAt(0));
        const cryptoKey = await this.getEncryptionKey();
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, bytes);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
}
