import { Storage } from "./storage";
import { logger } from "~/services/ConsoleLoggingService";

export class SecureStorage extends Storage {
    private cryptoKey: CryptoKey | null = null;
    private static readonly PBKDF2_ITERATIONS = 600000;
    private static readonly PBKDF2_KEY_LENGTH = 256;
    private static readonly STORAGE_KEY_LENGTH = 32; // 256 bits = 32 bytes
    private static readonly SALT_LENGTH = 16; // 128 bits = 16 bytes
    private static readonly ENCRYPTED_STORAGE_KEY_KEY = 'encryptedStorageKey';

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

    /**
     * Generate a secure random encryption key for storage.
     * The key must be extractable so it can be exported for encryption with the password.
     * @returns A 256-bit (32-byte) random key as CryptoKey
     */
    public static async generateStorageKey(): Promise<CryptoKey> {
        const keyMaterial = crypto.getRandomValues(new Uint8Array(this.STORAGE_KEY_LENGTH));
        return await crypto.subtle.importKey(
            "raw",
            keyMaterial,
            { name: "AES-GCM" },
            true, // Must be extractable to allow export for password-based encryption
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Derive a key from a password using PBKDF2.
     * @param password The password to derive a key from
     * @param salt The salt to use for key derivation
     * @returns A CryptoKey derived from the password
     */
    private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const passwordKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );

        // Ensure salt is a proper BufferSource by creating a new Uint8Array
        const saltBuffer = new Uint8Array(salt);

        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: SecureStorage.PBKDF2_ITERATIONS,
                hash: "SHA-256"
            },
            passwordKey,
            { name: "AES-GCM", length: SecureStorage.PBKDF2_KEY_LENGTH },
            false,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypt the storage key with the provided password.
     * @param storageKey The storage key to encrypt
     * @param password The password to encrypt with
     * @returns An object containing the encrypted key, IV, and salt
     */
    public async encryptStorageKey(storageKey: CryptoKey, password: string): Promise<{ encryptedKey: string; iv: number[]; salt: number[] }> {
        const salt = crypto.getRandomValues(new Uint8Array(SecureStorage.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for AES-GCM

        const derivedKey = await this.deriveKeyFromPassword(password, salt);
        const exportedKey = await crypto.subtle.exportKey("raw", storageKey);
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            derivedKey,
            exportedKey
        );

        return {
            encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: Array.from(iv),
            salt: Array.from(salt)
        };
    }

    /**
     * Decrypt the stored storage key using the provided password.
     * @param password The password to decrypt with
     * @returns The decrypted storage key as CryptoKey, or null if decryption fails
     */
    public async decryptStorageKey(password: string): Promise<CryptoKey | null> {
        try {
            const unsafeStorage = new Storage("local");
            const encryptedData = await unsafeStorage.get<{ encryptedKey: string; iv: number[]; salt: number[] }>(
                SecureStorage.ENCRYPTED_STORAGE_KEY_KEY
            );

            if (!encryptedData) {
                return null;
            }

            const salt = new Uint8Array(encryptedData.salt);
            const iv = new Uint8Array(encryptedData.iv);
            const encryptedBytes = Uint8Array.from(atob(encryptedData.encryptedKey), c => c.charCodeAt(0));

            const derivedKey = await this.deriveKeyFromPassword(password, salt);
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                derivedKey,
                encryptedBytes
            );

            // Import as extractable so it can be re-encrypted when changing passwords
            return await crypto.subtle.importKey(
                "raw",
                decrypted,
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            );
        } catch (error) {
            logger.error("Failed to decrypt storage key:", error);
            return null;
        }
    }

    /**
     * Store the encrypted storage key in unsafe local storage.
     * @param encryptedData The encrypted key data (from encryptStorageKey)
     */
    public static async storeEncryptedStorageKey(encryptedData: { encryptedKey: string; iv: number[]; salt: number[] }): Promise<void> {
        const unsafeStorage = new Storage("local");
        await unsafeStorage.set(SecureStorage.ENCRYPTED_STORAGE_KEY_KEY, encryptedData);
    }

    /**
     * Check if an encrypted storage key exists.
     */
    public static async hasEncryptedStorageKey(): Promise<boolean> {
        const unsafeStorage = new Storage("local");
        const key = await unsafeStorage.get(SecureStorage.ENCRYPTED_STORAGE_KEY_KEY);
        return key !== undefined && key !== null;
    }

    /**
     * Get the encryption key for data operations.
     * If no key is cached, decrypts the stored storage key using the password.
     */
    private async getEncryptionKey(): Promise<CryptoKey> {
        if (this.cryptoKey) return this.cryptoKey;

        if (!this.secret) {
            throw new Error("Password must be set before getting encryption key");
        }

        // Try to decrypt the stored storage key
        const storageKey = await this.decryptStorageKey(this.secret);
        if (!storageKey) {
            throw new Error("Failed to decrypt storage key. The password may be incorrect or no storage key exists.");
        }

        this.cryptoKey = storageKey;
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
