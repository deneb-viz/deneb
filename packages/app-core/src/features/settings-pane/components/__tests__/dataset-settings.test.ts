import { describe, expect, it } from 'vitest';
import type { SupportFieldFlags } from '@deneb-viz/data-core/support-fields';
import {
    MEASURE_FLAGS,
    COLUMN_FLAGS,
    FLAG_LABELS,
    FLAG_INFO,
    computeToggledConfig,
    hasAnyEnabledFlag,
    removeFieldFromConfig
} from '../dataset-settings-utils';

const baseFlags: SupportFieldFlags = {
    highlight: false,
    highlightStatus: false,
    highlightComparator: false,
    format: true,
    formatted: true,
    names: false,
    treatAsParameter: false
};

describe('flag applicability', () => {
    it('MEASURE_FLAGS has exactly 5 entries', () => {
        expect(MEASURE_FLAGS).toHaveLength(5);
    });

    it('MEASURE_FLAGS contains the expected keys', () => {
        expect([...MEASURE_FLAGS]).toEqual([
            'highlight',
            'highlightStatus',
            'highlightComparator',
            'format',
            'formatted'
        ]);
    });

    it('COLUMN_FLAGS has exactly 2 entries', () => {
        expect(COLUMN_FLAGS).toHaveLength(2);
    });

    it('COLUMN_FLAGS contains the expected keys', () => {
        expect([...COLUMN_FLAGS]).toEqual(['format', 'formatted']);
    });

    it('COLUMN_FLAGS is a subset of MEASURE_FLAGS', () => {
        for (const flag of COLUMN_FLAGS) {
            expect(MEASURE_FLAGS).toContain(flag);
        }
    });
});

describe('FLAG_LABELS coverage', () => {
    it('every MEASURE_FLAGS entry has a corresponding key in FLAG_LABELS', () => {
        for (const flag of MEASURE_FLAGS) {
            expect(FLAG_LABELS).toHaveProperty(flag);
            expect(typeof FLAG_LABELS[flag]).toBe('string');
            expect(FLAG_LABELS[flag].length).toBeGreaterThan(0);
        }
    });
});

describe('FLAG_INFO coverage', () => {
    it('every MEASURE_FLAGS entry has a corresponding key in FLAG_INFO', () => {
        for (const flag of MEASURE_FLAGS) {
            expect(FLAG_INFO).toHaveProperty(flag);
            expect(typeof FLAG_INFO[flag]).toBe('string');
            expect(FLAG_INFO[flag]!.length).toBeGreaterThan(0);
        }
    });
});

describe('computeToggledConfig', () => {
    it('returns a config with the target flag flipped and peer flags preserved', () => {
        const config = { Sales: baseFlags };
        const resolved = { Sales: baseFlags };

        const next = computeToggledConfig(
            config,
            resolved,
            'Sales',
            'highlight',
            true
        );

        expect(next).not.toBeNull();
        expect(next!.Sales.highlight).toBe(true);
        expect(next!.Sales.format).toBe(true);
        expect(next!.Sales.formatted).toBe(true);
    });

    it('creates a field entry from resolved defaults when none exists in config', () => {
        const config = {};
        const resolved = { Sales: baseFlags };

        const next = computeToggledConfig(
            config,
            resolved,
            'Sales',
            'highlight',
            true
        );

        expect(next).not.toBeNull();
        expect(next!.Sales).toBeDefined();
        expect(next!.Sales.highlight).toBe(true);
        expect(next!.Sales.format).toBe(true);
    });

    it('does not mutate other field entries', () => {
        const other = { ...baseFlags, format: false };
        const config = { A: baseFlags, B: other };
        const resolved = config;

        const next = computeToggledConfig(
            config,
            resolved,
            'A',
            'highlight',
            true
        );

        expect(next!.B).toBe(other);
    });

    it('returns null when the field has no resolved flags (stale-render guard)', () => {
        const result = computeToggledConfig(
            {},
            {},
            'Unknown',
            'highlight',
            true
        );
        expect(result).toBeNull();
    });

    it('can turn a flag off just as cleanly as on', () => {
        const config = { Sales: { ...baseFlags, highlight: true } };
        const resolved = config;

        const next = computeToggledConfig(
            config,
            resolved,
            'Sales',
            'highlight',
            false
        );

        expect(next!.Sales.highlight).toBe(false);
    });
});

describe('hasAnyEnabledFlag', () => {
    it('returns true when at least one applicable flag is enabled', () => {
        expect(hasAnyEnabledFlag(baseFlags, ['format', 'formatted'])).toBe(
            true
        );
    });

    it('returns false when every applicable flag is disabled', () => {
        const allOff: SupportFieldFlags = {
            ...baseFlags,
            format: false,
            formatted: false
        };
        expect(hasAnyEnabledFlag(allOff, ['format', 'formatted'])).toBe(false);
    });

    it('ignores flags that are enabled but not in applicableFlags', () => {
        expect(hasAnyEnabledFlag(baseFlags, ['highlight'])).toBe(false);
    });

    it('returns false when flags is undefined (stale-render guard)', () => {
        expect(hasAnyEnabledFlag(undefined, ['format'])).toBe(false);
    });

    it('returns false when applicableFlags is empty', () => {
        expect(hasAnyEnabledFlag(baseFlags, [])).toBe(false);
    });

    it('lights the hint when only a parameter metadata flag is enabled (e.g. treatAsParameter)', () => {
        const onlyTreated: SupportFieldFlags = {
            ...baseFlags,
            format: false,
            formatted: false,
            treatAsParameter: true
        };
        expect(hasAnyEnabledFlag(onlyTreated, ['treatAsParameter'])).toBe(true);
    });
});

describe('removeFieldFromConfig', () => {
    it('removes the named field and preserves the rest', () => {
        const config = {
            A: baseFlags,
            B: { ...baseFlags, format: false }
        };

        const next = removeFieldFromConfig(config, 'A');

        expect(next).not.toHaveProperty('A');
        expect(next.B).toBe(config.B);
    });

    it('is a no-op when the field is not present', () => {
        const config = { A: baseFlags };
        const next = removeFieldFromConfig(config, 'Missing');
        expect(next).toEqual(config);
    });

    it('does not mutate the input config', () => {
        const config = { A: baseFlags };
        removeFieldFromConfig(config, 'A');
        expect(config).toHaveProperty('A');
    });
});
