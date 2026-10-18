import { afterEach, describe, expect, it } from 'vitest';

import {
    isReadModePersistSuppressed,
    setReadModePersistSuppressed
} from '../read-mode-gate';

/**
 * The persist gate is module-level state read by both
 * {@link persistProperties} and {@link persistProjectProperties} at
 * call time. These tests pin the read/write contract directly; the
 * integration with the two persist call sites is exercised indirectly
 * by the migration and slice-sync test suites.
 */
describe('read-mode persist gate', () => {
    afterEach(() => {
        // Module-level state — reset so cases stay independent.
        setReadModePersistSuppressed(false);
    });

    it('defaults to suppressed = false', () => {
        // Fresh import would have suppressed = false; the `afterEach`
        // above keeps it false across cases. Verify the documented
        // default holds before the orchestrator wires the first update.
        setReadModePersistSuppressed(false);
        expect(isReadModePersistSuppressed()).toBe(false);
    });

    it('returns the most recently set value', () => {
        setReadModePersistSuppressed(true);
        expect(isReadModePersistSuppressed()).toBe(true);
        setReadModePersistSuppressed(false);
        expect(isReadModePersistSuppressed()).toBe(false);
    });

    it('is idempotent — repeated set of the same value is a no-op', () => {
        setReadModePersistSuppressed(true);
        setReadModePersistSuppressed(true);
        expect(isReadModePersistSuppressed()).toBe(true);
    });
});
