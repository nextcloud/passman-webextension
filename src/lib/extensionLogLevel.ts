export type ExtensionLogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

export const DEFAULT_EXTENSION_LOG_LEVEL: ExtensionLogLevel = 'error';

export const EXTENSION_LOG_LEVEL_RANK: Record<ExtensionLogLevel, number> = {
    debug: 10,
    log: 20,
    info: 20,
    warn: 30,
    error: 40,
};

const VALID_LOG_LEVELS = new Set<string>(Object.keys(EXTENSION_LOG_LEVEL_RANK));

export function isExtensionLogLevel(value: unknown): value is ExtensionLogLevel {
    return typeof value === 'string' && VALID_LOG_LEVELS.has(value);
}
