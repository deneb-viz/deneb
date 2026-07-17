/**
 * Power BI custom visuals run in a sandboxed iframe without the
 * `allow-same-origin` flag, so ANY access to `window.localStorage` throws a
 * `SecurityError` — including reads performed by third-party code.
 *
 * react-data-table-component v8's internal `useColorMode` hook reads
 * `localStorage.getItem('theme')` inside a `useState` initializer on every
 * mount, with only an SSR (`typeof window`) guard. In the Power BI sandbox
 * that throw escapes the component and takes down the table (caught by the
 * editor error boundary, but the table never renders). This did not occur
 * with v7, which never touched storage.
 *
 * `ensureSandboxSafeLocalStorage` probes `localStorage` and, when the
 * sandbox throws, shadows the accessor with an inert in-memory stub —
 * `Object.defineProperty` on `window` itself is permitted even in sandboxed
 * documents. The stub persists nothing (reads return `null`, writes are
 * discarded), so no storage capability is granted; the library simply falls
 * through to its DOM-class/`matchMedia` color-mode detection, which is
 * sandbox-safe.
 *
 * Candidate for removal once fixed upstream (the library should try/catch
 * its storage read).
 */

const INERT_STORAGE: Storage = {
    length: 0,
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    removeItem: () => undefined,
    setItem: () => undefined
};

export const ensureSandboxSafeLocalStorage = (
    target: Window | undefined = globalThis.window
): void => {
    if (!target) {
        return;
    }
    try {
        void target.localStorage;
    } catch {
        try {
            Object.defineProperty(target, 'localStorage', {
                value: INERT_STORAGE,
                configurable: true
            });
        } catch {
            // Shadowing failed (unexpected host behavior); leave the
            // original accessor in place — consumers will surface the
            // underlying SecurityError as before.
        }
    }
};
