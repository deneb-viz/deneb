// Vitest setup for the root visual suite (jsdom environment).
//
// Several modules under test transitively import the json-processing web-worker
// bootstrap (via `@deneb-viz/app-core` → field-processing tracking), which
// constructs a Worker from a blob URL at import time. jsdom implements neither
// `URL.createObjectURL` nor `Worker`, so provide inert shims here: the worker is
// never exercised by unit tests, it only needs to construct without throwing so
// the suites that touch this import graph can load. Suites that mock
// `@deneb-viz/app-core` never reach this code, so these shims are inert for them.

const url = globalThis.URL as unknown as {
    createObjectURL?: (obj: unknown) => string;
};
if (typeof url.createObjectURL !== 'function') {
    url.createObjectURL = () => 'blob:deneb-test-mock';
}

const globalWithWorker = globalThis as unknown as { Worker?: unknown };
if (typeof globalWithWorker.Worker !== 'function') {
    globalWithWorker.Worker = class {
        postMessage(): void {
            /* no-op: the tracking worker is never exercised in unit tests */
        }
        terminate(): void {
            /* no-op */
        }
        addEventListener(): void {
            /* no-op */
        }
        removeEventListener(): void {
            /* no-op */
        }
        onmessage: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
    };
}
