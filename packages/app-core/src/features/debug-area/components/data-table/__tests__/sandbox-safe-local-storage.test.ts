import { describe, expect, it } from 'vitest';
import { ensureSandboxSafeLocalStorage } from '../sandbox-safe-local-storage';

/**
 * Simulates the Power BI sandboxed-iframe behavior: any read of the
 * `localStorage` property throws a SecurityError. The helper must shadow
 * the accessor with an inert stub so third-party reads (rdt v8's
 * useColorMode) stop throwing, without granting persistence.
 */
const createSandboxedWindow = (): Window => {
    const fake = {};
    Object.defineProperty(fake, 'localStorage', {
        configurable: true,
        get() {
            throw new DOMException(
                "Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.",
                'SecurityError'
            );
        }
    });
    return fake as Window;
};

describe('ensureSandboxSafeLocalStorage', () => {
    it('shadows a throwing localStorage accessor with an inert stub', () => {
        const win = createSandboxedWindow();
        expect(() => win.localStorage).toThrow(/sandboxed/);
        ensureSandboxSafeLocalStorage(win);
        expect(() => win.localStorage).not.toThrow();
        expect(win.localStorage.getItem('theme')).toBeNull();
    });

    it('the stub discards writes and persists nothing', () => {
        const win = createSandboxedWindow();
        ensureSandboxSafeLocalStorage(win);
        win.localStorage.setItem('theme', 'dark');
        expect(win.localStorage.getItem('theme')).toBeNull();
        expect(win.localStorage.length).toBe(0);
        expect(win.localStorage.key(0)).toBeNull();
    });

    it('leaves a working localStorage untouched', () => {
        const store = new Map<string, string>();
        const working = {
            localStorage: {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => void store.set(k, v)
            }
        } as unknown as Window;
        const original = working.localStorage;
        ensureSandboxSafeLocalStorage(working);
        expect(working.localStorage).toBe(original);
        working.localStorage.setItem('theme', 'dark');
        expect(working.localStorage.getItem('theme')).toBe('dark');
    });

    it('is a no-op when window is unavailable (node test env)', () => {
        expect(() => ensureSandboxSafeLocalStorage(undefined)).not.toThrow();
        // Default argument path: globalThis.window is undefined in the node
        // environment this suite runs in.
        expect(() => ensureSandboxSafeLocalStorage()).not.toThrow();
    });

    it('is idempotent once shadowed', () => {
        const win = createSandboxedWindow();
        ensureSandboxSafeLocalStorage(win);
        const stub = win.localStorage;
        ensureSandboxSafeLocalStorage(win);
        expect(win.localStorage).toBe(stub);
    });
});
