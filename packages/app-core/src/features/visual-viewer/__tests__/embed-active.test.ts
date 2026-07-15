import { describe, expect, it } from 'vitest';
import type { InterfaceType } from '../../../lib/interface';
import { computeEmbedActive } from '../embed-active';

/**
 * Every interface mode in the union. If the union grows, this array must grow
 * with it so the mutual-exclusion property below keeps covering all modes.
 */
const INTERFACE_TYPES: InterfaceType[] = ['viewer', 'editor'];

describe('computeEmbedActive — truth table', () => {
    it('standalone viewer instance is active only in viewer mode', () => {
        expect(computeEmbedActive('viewer', false)).toBe(true);
        expect(computeEmbedActive('editor', false)).toBe(false);
    });

    it('editor-embedded instance is active only in editor mode', () => {
        expect(computeEmbedActive('editor', true)).toBe(true);
        expect(computeEmbedActive('viewer', true)).toBe(false);
    });
});

describe('computeEmbedActive — mutual exclusion (defect C1)', () => {
    it('for every interface mode exactly one of the two instances is active', () => {
        for (const type of INTERFACE_TYPES) {
            const embedded = computeEmbedActive(type, true);
            const standalone = computeEmbedActive(type, false);
            // For the current viewer|editor union each mode activates exactly
            // one instance, so the two results must differ. Should the union
            // ever gain a mode where BOTH are inactive, relax this to assert
            // `!(embedded && standalone)` (never both active) instead.
            expect(embedded).not.toBe(standalone);
        }
    });

    it('never activates both instances for any interface mode', () => {
        for (const type of INTERFACE_TYPES) {
            expect(
                computeEmbedActive(type, true) &&
                    computeEmbedActive(type, false)
            ).toBe(false);
        }
    });
});
