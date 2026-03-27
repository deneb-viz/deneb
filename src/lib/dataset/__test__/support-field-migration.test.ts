// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('@deneb-viz/configuration', () => ({
    PROJECT_DEFAULTS: {
        spec: '{"$schema":"...","mark":"bar"}'
    }
}));

import { isLegacySpec } from '../support-field-migration';

describe('isLegacySpec', () => {
    const DEFAULT_SPEC = '{"$schema":"...","mark":"bar"}';
    const CUSTOM_SPEC = '{"$schema":"...","mark":"line","encoding":{}}';

    it('should return true for existing spec with no support field config', () => {
        expect(isLegacySpec(CUSTOM_SPEC, {})).toBe(true);
    });

    it('should return false when support field config has entries', () => {
        const config = {
            Amount: {
                highlight: true,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false
            }
        };
        expect(isLegacySpec(CUSTOM_SPEC, config)).toBe(false);
    });

    it('should return false for brand new spec (default template)', () => {
        expect(isLegacySpec(DEFAULT_SPEC, {})).toBe(false);
    });

    it('should return false for brand new spec even with config', () => {
        const config = {
            Amount: {
                highlight: true,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false
            }
        };
        expect(isLegacySpec(DEFAULT_SPEC, config)).toBe(false);
    });
});
