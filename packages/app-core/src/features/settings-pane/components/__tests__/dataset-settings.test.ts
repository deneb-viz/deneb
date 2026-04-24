import { describe, expect, it } from 'vitest';
import type {
    SupportFieldFlags,
    SupportFieldMasterSettings
} from '@deneb-viz/data-core/support-fields';
import type { DatasetField } from '@deneb-viz/data-core/field';
import {
    MEASURE_FLAGS,
    COLUMN_FLAGS,
    FLAG_LABELS,
    FLAG_INFO,
    computeToggledConfig,
    hasAnyEnabledFlag,
    removeFieldFromConfig,
    resolveFieldApplicability,
    resolveFieldFlagsForConfig
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

const ALL_FLAG_KEYS = [...MEASURE_FLAGS, 'names', 'treatAsParameter'] as const;

describe('FLAG_LABELS coverage', () => {
    it('every applicable flag key has a corresponding entry in FLAG_LABELS', () => {
        for (const flag of ALL_FLAG_KEYS) {
            expect(FLAG_LABELS).toHaveProperty(flag);
            expect(typeof FLAG_LABELS[flag]).toBe('string');
            expect(FLAG_LABELS[flag].length).toBeGreaterThan(0);
        }
    });
});

describe('FLAG_INFO coverage', () => {
    it('every applicable flag key has a corresponding entry in FLAG_INFO', () => {
        for (const flag of ALL_FLAG_KEYS) {
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

const masterOn: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: true
};

const field = (role: DatasetField['role']): DatasetField =>
    ({ role }) as DatasetField;

describe('resolveFieldFlagsForConfig', () => {
    it('returns the explicit config entry when present', () => {
        const explicit: SupportFieldFlags = { ...baseFlags, highlight: true };
        const config = { Sales: explicit };
        const out = resolveFieldFlagsForConfig(
            field('aggregation'),
            config,
            'Sales',
            masterOn,
            false
        );
        expect(out).toBe(explicit);
    });

    it('falls back to resolveFieldDefaults when the field has no explicit entry', () => {
        const out = resolveFieldFlagsForConfig(
            field('aggregation'),
            {},
            'Sales',
            masterOn,
            false
        );
        // Defaults for a measure with cross-highlight enabled enable `highlight`.
        expect(out.highlight).toBe(true);
    });

    it('legacy classification produces different defaults than current', () => {
        const current = resolveFieldFlagsForConfig(
            field('aggregation'),
            {},
            'Sales',
            masterOn,
            false
        );
        const legacy = resolveFieldFlagsForConfig(
            field('aggregation'),
            {},
            'Sales',
            masterOn,
            true
        );
        expect(legacy).not.toEqual(current);
    });
});

describe('resolveFieldApplicability', () => {
    const run = (
        role: DatasetField['role'],
        flags: SupportFieldFlags,
        highlightEnabled: boolean,
        consolidateFieldParameters: boolean
    ) =>
        resolveFieldApplicability({
            field: field(role),
            fieldFlags: flags,
            highlightEnabled,
            consolidateFieldParameters
        });

    it('measure + highlight enabled exposes every MEASURE_FLAG', () => {
        const out = run('aggregation', baseFlags, true, false);
        expect(out.isMeasure).toBe(true);
        expect(out.isFieldParameter).toBe(false);
        expect(out.isParameter).toBe(false);
        for (const flag of MEASURE_FLAGS) {
            expect(out.applicableFlags).toContain(flag);
        }
    });

    it('measure + highlight disabled collapses to COLUMN_FLAGS', () => {
        const out = run('aggregation', baseFlags, false, false);
        expect(out.applicableFlags).toEqual([...COLUMN_FLAGS]);
    });

    it('grouping (non-measure, non-parameter) always collapses to COLUMN_FLAGS', () => {
        const out = run('grouping', baseFlags, true, false);
        expect(out.isMeasure).toBe(false);
        expect(out.applicableFlags).toEqual([...COLUMN_FLAGS]);
    });

    it('field-parameter role is classified as a parameter', () => {
        const out = run('field-parameter', baseFlags, true, false);
        expect(out.isFieldParameter).toBe(true);
        expect(out.isParameter).toBe(true);
    });

    it('treatAsParameter lifts a grouping field into parameter classification', () => {
        const out = run(
            'grouping',
            { ...baseFlags, treatAsParameter: true },
            true,
            false
        );
        expect(out.isFieldParameter).toBe(false);
        expect(out.isTreatedAs).toBe(true);
        expect(out.isParameter).toBe(true);
    });

    it('consolidation appends treatAsParameter / names for a grouping field', () => {
        const out = run('grouping', baseFlags, true, true);
        expect(out.applicableFlags).toContain('treatAsParameter');
        expect(out.applicableFlags).not.toContain('names');
    });

    it('consolidation + parameter classification appends names', () => {
        const out = run('field-parameter', baseFlags, true, true);
        expect(out.applicableFlags).toContain('names');
    });
});
