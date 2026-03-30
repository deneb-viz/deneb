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

    it('should return true for existing spec with metaVersion 0 (never set)', () => {
        expect(isLegacySpec(CUSTOM_SPEC, 0)).toBe(true);
    });

    it('should return true for existing spec with metaVersion 1 (pre-2.0)', () => {
        expect(isLegacySpec(CUSTOM_SPEC, 1)).toBe(true);
    });

    it('should return false for existing spec with metaVersion 2 (2.0+)', () => {
        expect(isLegacySpec(CUSTOM_SPEC, 2)).toBe(false);
    });

    it('should return false for brand new spec (default template) regardless of metaVersion', () => {
        expect(isLegacySpec(DEFAULT_SPEC, 0)).toBe(false);
    });

    it('should return false for future metaVersions', () => {
        expect(isLegacySpec(CUSTOM_SPEC, 3)).toBe(false);
    });
});
