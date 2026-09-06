import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The registry consults `PROJECT_DEFAULTS.spec` to distinguish "genuinely
// unversioned legacy payload" from "empty because fresh visual /
// cross-GUID import". A deterministic sentinel keeps the fixtures
// independent of the real default template.
vi.mock('@deneb-viz/configuration', () => ({
    PROJECT_DEFAULTS: {
        spec: '__default_spec__',
        config: '__default_config__'
    }
}));

import {
    assertStateManagementRegistryIntegrity,
    getCurrentStateManagementVersion,
    getStateManagementVersionToStamp,
    hasProjectContent,
    inspectStateManagementPayload,
    isStateManagementMigrationPending,
    isSupportFieldMigrationPending,
    parseDenebMetaVersion,
    runStateManagementLoadTimeMigrations,
    StateManagementRegistryError,
    SUPPORT_FIELD_LEGACY_MIGRATION_ID,
    type StateManagementLoadTimeMigrationEntry,
    type StateManagementMigrationEntry,
    type StateManagementPayload,
    type StateManagementPayloadClassification
} from '../state-management-migration';

const DEFAULT_SPEC = '__default_spec__';
const CUSTOM_SPEC = '{"mark":"bar","encoding":{}}';
const WITH_PROJECT = { hasProjectContent: true };
const WITHOUT_PROJECT = { hasProjectContent: false };

// ─── Synthetic registry helpers ──────────────────────────────────────────────

const loadTimeEntry = (
    id: string,
    fromVersion: number,
    toVersion: number,
    migrate: StateManagementLoadTimeMigrationEntry['migrate'] = () => ({})
): StateManagementMigrationEntry => ({
    id,
    fromVersion,
    toVersion,
    migrationClass: 'load-time',
    requiresProjectContent: false,
    description: `synthetic load-time ${id}`,
    migrate
});

const firstDataviewEntry = (
    id: string,
    fromVersion: number,
    toVersion: number
): StateManagementMigrationEntry => ({
    id,
    fromVersion,
    toVersion,
    migrationClass: 'first-dataview',
    requiresProjectContent: true,
    description: `synthetic first-dataview ${id}`
});

// ─── Registry contract ───────────────────────────────────────────────────────

describe('registry integrity', () => {
    it('the REAL registry is valid and its current version is 2', () => {
        // 2 is the first stamped version (2.0 is the last unversioned
        // shape). It deliberately coincides with the value the mapping
        // pass currently stamps via TEMPLATE_USERMETA_VERSION — U3 routes
        // that stamp through getStateManagementVersionToStamp.
        expect(getCurrentStateManagementVersion()).toBe(2);
    });

    it('rejects an empty registry', () => {
        expect(() => assertStateManagementRegistryIntegrity([])).toThrow(
            StateManagementRegistryError
        );
    });

    it('rejects a chain that does not start at version 0', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([loadTimeEntry('a', 1, 2)])
        ).toThrow(/expected fromVersion 0/);
    });

    it('rejects a gap in the chain as a hard error', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([
                loadTimeEntry('a', 0, 2),
                loadTimeEntry('b', 3, 4)
            ])
        ).toThrow(/out of order or leaves a gap/);
    });

    it('rejects out-of-order registration as a hard error', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([
                loadTimeEntry('b', 2, 3),
                loadTimeEntry('a', 0, 2)
            ])
        ).toThrow(StateManagementRegistryError);
    });

    it('rejects duplicate registration of the same range', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([
                loadTimeEntry('a', 0, 2),
                loadTimeEntry('b', 0, 2)
            ])
        ).toThrow(StateManagementRegistryError);
    });

    it('rejects duplicate migration ids', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([
                loadTimeEntry('a', 0, 1),
                loadTimeEntry('a', 1, 2)
            ])
        ).toThrow(/registered more than once/);
    });

    it('rejects an entry that does not advance the version', () => {
        expect(() =>
            assertStateManagementRegistryIntegrity([loadTimeEntry('a', 0, 0)])
        ).toThrow(/does not advance/);
    });

    it('rejects a load-time entry without a migrate function', () => {
        const entry = {
            ...loadTimeEntry('a', 0, 1),
            migrate: undefined
        } as unknown as StateManagementMigrationEntry;
        expect(() => assertStateManagementRegistryIntegrity([entry])).toThrow(
            /must supply a migrate/
        );
    });

    it('rejects a first-dataview entry that supplies a migrate function', () => {
        const entry = {
            ...firstDataviewEntry('a', 0, 1),
            migrate: () => ({})
        } as unknown as StateManagementMigrationEntry;
        expect(() => assertStateManagementRegistryIntegrity([entry])).toThrow(
            /must not supply a migrate/
        );
    });

    it('throws on queries for unknown migration ids', () => {
        expect(() =>
            isStateManagementMigrationPending('nope', 0, WITH_PROJECT)
        ).toThrow(StateManagementRegistryError);
        expect(() => getStateManagementVersionToStamp('nope')).toThrow(
            StateManagementRegistryError
        );
    });
});

// ─── Version stamp parsing ───────────────────────────────────────────────────

describe('parseDenebMetaVersion', () => {
    it('treats absent/empty as unversioned (0)', () => {
        expect(parseDenebMetaVersion(undefined).version).toBe(0);
        expect(parseDenebMetaVersion(null).version).toBe(0);
        expect(parseDenebMetaVersion('').version).toBe(0);
    });

    it('parses a numeric stamp', () => {
        expect(parseDenebMetaVersion('2')).toEqual({ version: 2 });
    });

    it('flags a non-numeric stamp as corrupt with a null version', () => {
        const result = parseDenebMetaVersion('banana');
        expect(result.version).toBeNull();
        expect(result.corrupt).toMatchObject({
            key: 'denebMetaVersion',
            rawValue: 'banana'
        });
    });
});

// ─── Load-time pipeline behaviour (synthetic registries) ─────────────────────

describe('runStateManagementLoadTimeMigrations — ordering & merge', () => {
    it('applies pending entries in fromVersion order and stamps the final version', () => {
        const order: string[] = [];
        const entries = [
            loadTimeEntry('zero-to-one', 0, 1, () => {
                order.push('zero-to-one');
                return { scaleToZoom: true };
            }),
            loadTimeEntry('one-to-two', 1, 2, () => {
                order.push('one-to-two');
                return { consolidateFieldParameters: false };
            })
        ];
        const result = runStateManagementLoadTimeMigrations(
            { supportFieldConfiguration: '{"a":{}}' },
            WITH_PROJECT,
            entries
        );
        expect(order).toEqual(['zero-to-one', 'one-to-two']);
        expect(result.applied).toEqual(['zero-to-one', 'one-to-two']);
        expect(result.version).toBe(2);
        expect(result.payload).toEqual({
            // Present keys survive — merged, never replaced.
            supportFieldConfiguration: '{"a":{}}',
            scaleToZoom: true,
            consolidateFieldParameters: false,
            denebMetaVersion: '2'
        });
    });

    it('starts mid-chain for a partially-migrated payload', () => {
        const order: string[] = [];
        const entries = [
            loadTimeEntry('zero-to-one', 0, 1, () => {
                order.push('zero-to-one');
                return {};
            }),
            loadTimeEntry('one-to-two', 1, 2, () => {
                order.push('one-to-two');
                return {};
            })
        ];
        const result = runStateManagementLoadTimeMigrations(
            { denebMetaVersion: '1' },
            WITH_PROJECT,
            entries
        );
        expect(order).toEqual(['one-to-two']);
        expect(result.version).toBe(2);
        expect(result.payload.denebMetaVersion).toBe('2');
    });

    it('re-running on its own output is a no-op (stale-echo idempotency)', () => {
        const migrate = vi.fn(() => ({ scaleToZoom: true }));
        const entries = [loadTimeEntry('zero-to-two', 0, 2, migrate)];
        const first = runStateManagementLoadTimeMigrations(
            {},
            WITH_PROJECT,
            entries
        );
        expect(first.applied).toEqual(['zero-to-two']);
        // The sync layer can replay the migration's own persisted output
        // back ~5s later — this must not double-apply.
        const echo = runStateManagementLoadTimeMigrations(
            first.payload,
            WITH_PROJECT,
            entries
        );
        expect(migrate).toHaveBeenCalledTimes(1);
        expect(echo.applied).toEqual([]);
        expect(echo.classification).toBe('current');
        expect(echo.payload).toEqual(first.payload);
    });

    it('a pending first-dataview entry blocks later entries', () => {
        const migrate = vi.fn(() => ({}));
        const entries = [
            firstDataviewEntry('data-dependent', 0, 2),
            loadTimeEntry('two-to-three', 2, 3, migrate)
        ];
        const result = runStateManagementLoadTimeMigrations(
            {},
            WITH_PROJECT,
            entries
        );
        expect(result.pendingFirstDataview).toEqual(['data-dependent']);
        expect(result.applied).toEqual([]);
        expect(migrate).not.toHaveBeenCalled();
        // No stamp is written — the first-dataview execution point owns it.
        expect(result.payload).toEqual({});
        expect(result.version).toBe(0);
    });

    it('runs load-time entries beyond a COMPLETED first-dataview entry', () => {
        const entries = [
            firstDataviewEntry('data-dependent', 0, 2),
            loadTimeEntry('two-to-three', 2, 3, () => ({ scaleToZoom: true }))
        ];
        // The mapping pass has executed the data-dependent entry and
        // stamped 2; the next load picks up the chain from there.
        const result = runStateManagementLoadTimeMigrations(
            { denebMetaVersion: '2' },
            WITH_PROJECT,
            entries
        );
        expect(result.pendingFirstDataview).toEqual([]);
        expect(result.applied).toEqual(['two-to-three']);
        expect(result.payload.denebMetaVersion).toBe('3');
    });

    it('never migrates a payload stamped ABOVE the current version downwards', () => {
        const migrate = vi.fn(() => ({}));
        const entries = [loadTimeEntry('zero-to-two', 0, 2, migrate)];
        const input = { denebMetaVersion: '5', scaleToZoom: true };
        const result = runStateManagementLoadTimeMigrations(
            input,
            WITH_PROJECT,
            entries
        );
        expect(result.classification).toBe('current');
        expect(migrate).not.toHaveBeenCalled();
        expect(result.payload).toEqual(input);
    });
});

describe('runStateManagementLoadTimeMigrations — classification guards', () => {
    it('does not treat an empty payload without project content as legacy (cross-GUID / fresh visual)', () => {
        const result = runStateManagementLoadTimeMigrations(
            {},
            WITHOUT_PROJECT
        );
        expect(result.classification).toBe('empty-or-cross-guid');
        expect(result.applied).toEqual([]);
        expect(result.pendingFirstDataview).toEqual([]);
        expect(result.payload).toEqual({});
    });

    it('treats the same empty payload WITH project content as genuinely legacy', () => {
        const result = runStateManagementLoadTimeMigrations({}, WITH_PROJECT);
        expect(result.classification).toBe('unversioned-legacy');
        expect(result.pendingFirstDataview).toEqual([
            SUPPORT_FIELD_LEGACY_MIGRATION_ID
        ]);
    });

    it('completes a partial payload without wiping present keys', () => {
        const input: StateManagementPayload = {
            supportFieldConfiguration: '{"Units":{"highlight":false}}',
            scaleToZoom: true
        };
        const result = runStateManagementLoadTimeMigrations(
            input,
            WITH_PROJECT
        );
        expect(result.classification).toBe('unversioned-legacy');
        expect(result.payload).toEqual(input);
    });

    it('surfaces corrupt JSON in a persisted key as a typed signal, not a silent reset', () => {
        const input: StateManagementPayload = {
            supportFieldConfiguration: '{"broken": tru',
            denebMetaVersion: '2'
        };
        const result = runStateManagementLoadTimeMigrations(
            input,
            WITH_PROJECT
        );
        expect(result.corruptKeys).toHaveLength(1);
        expect(result.corruptKeys[0]).toMatchObject({
            key: 'supportFieldConfiguration',
            rawValue: '{"broken": tru'
        });
        expect(result.corruptKeys[0].error).toBeTruthy();
        // Raw value left in place.
        expect(result.payload).toEqual(input);
    });

    it('fails safe on an unreadable version stamp: runs nothing, surfaces the signal', () => {
        const migrate = vi.fn(() => ({}));
        const entries = [loadTimeEntry('zero-to-two', 0, 2, migrate)];
        const input: StateManagementPayload = {
            denebMetaVersion: '###',
            scaleToZoom: true
        };
        const result = runStateManagementLoadTimeMigrations(
            input,
            WITH_PROJECT,
            entries
        );
        expect(result.classification).toBe('indeterminate');
        expect(migrate).not.toHaveBeenCalled();
        expect(result.corruptKeys[0].key).toBe('denebMetaVersion');
        expect(result.payload).toEqual(input);
    });
});

// ─── First-dataview (class b) registration seam ──────────────────────────────

describe('isSupportFieldMigrationPending (registry-owned isLegacySpec)', () => {
    it('matches the legacy decision table exactly', () => {
        // Existing project, never stamped → pending.
        expect(isSupportFieldMigrationPending(CUSTOM_SPEC, 0)).toBe(true);
        // Existing project, pre-2.0 stamp → pending.
        expect(isSupportFieldMigrationPending(CUSTOM_SPEC, 1)).toBe(true);
        // Already stamped at 2 → not pending.
        expect(isSupportFieldMigrationPending(CUSTOM_SPEC, 2)).toBe(false);
        // Brand-new / cross-GUID (default template) → never pending.
        expect(isSupportFieldMigrationPending(DEFAULT_SPEC, 0)).toBe(false);
        // Future stamps → not pending (never migrate downwards).
        expect(isSupportFieldMigrationPending(CUSTOM_SPEC, 3)).toBe(false);
    });

    it('is a no-op against a stale echo of its own persisted output', () => {
        // The mapping pass stamps toVersion on completion; when the sync
        // layer echoes that persisted output back, the decision must flip
        // to false — no double application.
        const stamped = getStateManagementVersionToStamp(
            SUPPORT_FIELD_LEGACY_MIGRATION_ID
        );
        expect(isSupportFieldMigrationPending(CUSTOM_SPEC, stamped)).toBe(
            false
        );
    });

    it('exposes the version the mapping pass must stamp on completion', () => {
        expect(
            getStateManagementVersionToStamp(SUPPORT_FIELD_LEGACY_MIGRATION_ID)
        ).toBe(2);
    });

    it('hasProjectContent discriminates factory-default from real specs', () => {
        expect(hasProjectContent(DEFAULT_SPEC)).toBe(false);
        expect(hasProjectContent(CUSTOM_SPEC)).toBe(true);
    });
});

// ─── Fixture corpus replay ───────────────────────────────────────────────────

interface FixtureFile {
    description: string;
    jsonSpec: string | null;
    stateManagement: StateManagementPayload;
    expected: {
        classification: StateManagementPayloadClassification;
        applied: string[];
        pendingFirstDataview: string[];
        corruptKeys: string[];
        payload: StateManagementPayload;
    };
}

// jsdom rewrites `import.meta.url` to an http scheme, so resolve from the
// repo root (vitest's cwd) instead.
const FIXTURES_DIR = resolve(
    process.cwd(),
    'src/lib/persistence/__test__/fixtures'
);
const FIXTURE_FILES = readdirSync(FIXTURES_DIR).filter((f) =>
    f.endsWith('.json')
);

describe('fixture corpus replay', () => {
    it('the corpus is present (guards against a vacuous replay)', () => {
        expect(FIXTURE_FILES.length).toBeGreaterThanOrEqual(6);
    });

    it.each(FIXTURE_FILES)('%s replays to the expected final shape', (file) => {
        const fixture: FixtureFile = JSON.parse(
            readFileSync(join(FIXTURES_DIR, file), 'utf-8')
        );
        // `jsonSpec: null` in a fixture means "the factory default
        // template" (fresh visual / cross-GUID import).
        const jsonSpec = fixture.jsonSpec ?? DEFAULT_SPEC;
        const context = { hasProjectContent: hasProjectContent(jsonSpec) };
        const result = runStateManagementLoadTimeMigrations(
            fixture.stateManagement,
            context
        );
        expect(result.classification).toBe(fixture.expected.classification);
        expect(result.applied).toEqual(fixture.expected.applied);
        expect(result.pendingFirstDataview).toEqual(
            fixture.expected.pendingFirstDataview
        );
        expect(result.corruptKeys.map((c) => c.key)).toEqual(
            fixture.expected.corruptKeys
        );
        expect(result.payload).toEqual(fixture.expected.payload);
    });

    it.each(FIXTURE_FILES)(
        '%s is idempotent when its own output is replayed (stale echo)',
        (file) => {
            const fixture: FixtureFile = JSON.parse(
                readFileSync(join(FIXTURES_DIR, file), 'utf-8')
            );
            const jsonSpec = fixture.jsonSpec ?? DEFAULT_SPEC;
            const context = {
                hasProjectContent: hasProjectContent(jsonSpec)
            };
            const first = runStateManagementLoadTimeMigrations(
                fixture.stateManagement,
                context
            );
            const echo = runStateManagementLoadTimeMigrations(
                first.payload,
                context
            );
            expect(echo.applied).toEqual([]);
            expect(echo.payload).toEqual(first.payload);
        }
    );

    it('classifications across the corpus cover the legacy/empty/current/corrupt space', () => {
        const classifications = new Set(
            FIXTURE_FILES.map((file) => {
                const fixture: FixtureFile = JSON.parse(
                    readFileSync(join(FIXTURES_DIR, file), 'utf-8')
                );
                return fixture.expected.classification;
            })
        );
        expect(classifications).toContain('unversioned-legacy');
        expect(classifications).toContain('empty-or-cross-guid');
        expect(classifications).toContain('current');
        expect(classifications).toContain('indeterminate');
    });
});

// ─── inspectStateManagementPayload ───────────────────────────────────────────

describe('inspectStateManagementPayload', () => {
    it('classifies a stamped-but-outdated payload as versioned-outdated', () => {
        const { classification } = inspectStateManagementPayload(
            { denebMetaVersion: '1' },
            WITH_PROJECT
        );
        expect(classification).toBe('versioned-outdated');
    });

    it('accepts a valid supportFieldConfiguration without signalling', () => {
        const { corruptKeys } = inspectStateManagementPayload(
            {
                denebMetaVersion: '2',
                supportFieldConfiguration: '{"Sales":{"highlight":true}}'
            },
            WITH_PROJECT
        );
        expect(corruptKeys).toEqual([]);
    });
});
