import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
//
// `handlePropertyMigration` reads from three places: the app-core migration
// slice (for `migrationCheckPerformed` and `updateMigrationDetails`), the
// visual store (for `isUnversionedSpec` / `isVersionedSpec` lookups), and
// the visual host (when persisting). The mocks below let the test control
// each independently and observe what the function did.

vi.mock('@deneb-viz/utils/logging', () => ({
    logDebug: vi.fn()
}));

// `getVegaVersion` is consulted for the current provider's expected version
// stamp. Real implementation reads from `@deneb-viz/vega-runtime/embed`'s
// version constants — we just need a deterministic value.
vi.mock('@deneb-viz/vega-runtime/embed', () => ({
    getVegaVersion: (provider: string) =>
        provider === 'vega' ? '6.2.0' : '6.4.0'
}));

// `APPLICATION_VERSION` is the current Deneb version stamp.
vi.mock('../../application', () => ({
    APPLICATION_VERSION: '2.0.0'
}));

// `PROJECT_DEFAULTS` is consulted by `isNewSpec` to detect the
// "factory-default" untouched-spec case.
vi.mock('@deneb-viz/configuration', () => ({
    PROJECT_DEFAULTS: {
        spec: '__default_spec__',
        config: '__default_config__'
    }
}));

const mockUpdateMigrationDetails = vi.fn();
let mockMigrationCheckPerformed = false;

vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        migration: {
            migrationCheckPerformed: mockMigrationCheckPerformed,
            updateMigrationDetails: mockUpdateMigrationDetails
        }
    }))
}));

let mockVisualSettings: TestSettings;

vi.mock('../../../state', () => ({
    getDenebVisualState: vi.fn(() => ({
        settings: mockVisualSettings,
        // `persist.ts` reads `.updates.options?.dataViews?...?.objects` to
        // diff against currently-persisted values. The optional chain on
        // `options` is enough — but `updates` itself is dereferenced
        // unconditionally, so it must exist on the mock state.
        updates: { options: undefined }
    }))
}));

const mockHostPersistProperties = vi.fn();
vi.mock('../../host', () => ({
    getVisualHost: vi.fn(() => ({
        persistProperties: mockHostPersistProperties
    }))
}));

import { handlePropertyMigration } from '../migration';
import { setReadModePersistSuppressed } from '../read-mode-gate';

// ─── Test fixture types ──────────────────────────────────────────────────────

/**
 * Minimal shape of `VisualFormattingSettingsModel` the migration code
 * reads from. Real Power BI formatting settings are typed via the
 * formatting-settings library; the migration code only ever touches
 * `.value` on a handful of nested fields, so a typed-cast plain-object
 * is enough for these tests.
 */
type TestField<T> = { value: T };
type TestSettings = {
    developer: { versioning: { version: TestField<string> } };
    vega: {
        output: {
            provider: TestField<string>;
            version: TestField<string>;
            jsonSpec: TestField<string>;
            jsonConfig: TestField<string>;
        };
        interactivity: {
            enableContextMenu: TestField<boolean>;
            enableContextMenuSelector: TestField<boolean>;
        };
    };
};

const buildSettings = (overrides: {
    denebVersion?: string;
    providerVersion?: string;
    jsonSpec?: string;
    jsonConfig?: string;
    enableContextMenu?: boolean;
    enableContextMenuSelector?: boolean;
}): TestSettings => ({
    developer: {
        versioning: { version: { value: overrides.denebVersion ?? '' } }
    },
    vega: {
        output: {
            provider: { value: 'vegaLite' },
            version: { value: overrides.providerVersion ?? '' },
            jsonSpec: { value: overrides.jsonSpec ?? 'user-spec' },
            jsonConfig: { value: overrides.jsonConfig ?? 'user-config' }
        },
        interactivity: {
            enableContextMenu: {
                value: overrides.enableContextMenu ?? true
            },
            enableContextMenuSelector: {
                value: overrides.enableContextMenuSelector ?? true
            }
        }
    }
});

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    mockUpdateMigrationDetails.mockReset();
    mockHostPersistProperties.mockReset();
    mockMigrationCheckPerformed = false;
    setReadModePersistSuppressed(false);
});

describe('handlePropertyMigration — edit mode', () => {
    it('persists version stamps for an unversioned (pre-1.1) spec', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '',
            providerVersion: ''
        });
        handlePropertyMigration(mockVisualSettings as never, false);

        expect(mockUpdateMigrationDetails).toHaveBeenCalledTimes(1);
        expect(mockHostPersistProperties).toHaveBeenCalledTimes(1);
        // Verify the persisted payload includes the new version stamps.
        const persistedPayload = mockHostPersistProperties.mock.calls[0][0];
        const replaceInstances = persistedPayload.replace ?? [];
        const developer = replaceInstances.find(
            (i: { objectName: string }) => i.objectName === 'developer'
        );
        const vega = replaceInstances.find(
            (i: { objectName: string }) => i.objectName === 'vega'
        );
        expect(developer?.properties?.version).toBe('2.0.0');
        expect(vega?.properties?.version).toBe('6.4.0');
    });

    it('persists context-menu remap when migrating from pre-1.10 with legacy state', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '1.9.0',
            providerVersion: '6.0.0',
            enableContextMenu: false,
            enableContextMenuSelector: true
        });
        handlePropertyMigration(mockVisualSettings as never, false);

        expect(mockHostPersistProperties).toHaveBeenCalledTimes(1);
        const persistedPayload = mockHostPersistProperties.mock.calls[0][0];
        const vega = persistedPayload.replace.find(
            (i: { objectName: string }) => i.objectName === 'vega'
        );
        expect(vega?.properties?.enableContextMenu).toBe(true);
        expect(vega?.properties?.enableContextMenuSelector).toBe(false);
    });

    it('skips when migrationCheckPerformed is already true', () => {
        mockMigrationCheckPerformed = true;
        mockVisualSettings = buildSettings({
            denebVersion: '',
            providerVersion: ''
        });
        handlePropertyMigration(mockVisualSettings as never, false);

        expect(mockUpdateMigrationDetails).not.toHaveBeenCalled();
        expect(mockHostPersistProperties).not.toHaveBeenCalled();
    });
});

describe('handlePropertyMigration — read mode', () => {
    it('never persists, never flips the flag, never opens the modal', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '',
            providerVersion: ''
        });
        // The read-mode gate is what blocks the host call. The orchestrator
        // sets it; we mirror that here so the assertion sees the gated path
        // even if a persist were accidentally attempted.
        setReadModePersistSuppressed(true);
        handlePropertyMigration(mockVisualSettings as never, true);

        expect(mockUpdateMigrationDetails).not.toHaveBeenCalled();
        expect(mockHostPersistProperties).not.toHaveBeenCalled();
    });

    it('applies version stamps in-memory for an unversioned spec', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '',
            providerVersion: ''
        });
        setReadModePersistSuppressed(true);
        handlePropertyMigration(mockVisualSettings as never, true);

        expect(mockVisualSettings.developer.versioning.version.value).toBe(
            '2.0.0'
        );
        expect(mockVisualSettings.vega.output.version.value).toBe('6.4.0');
    });

    it('applies context-menu remap in-memory when migrating from pre-1.10 with legacy state', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '1.9.0',
            providerVersion: '6.0.0',
            enableContextMenu: false,
            enableContextMenuSelector: true
        });
        setReadModePersistSuppressed(true);
        handlePropertyMigration(mockVisualSettings as never, true);

        expect(
            mockVisualSettings.vega.interactivity.enableContextMenu.value
        ).toBe(true);
        expect(
            mockVisualSettings.vega.interactivity.enableContextMenuSelector
                .value
        ).toBe(false);
    });

    it('does not remap context-menu when previous version is already >= 1.10', () => {
        mockVisualSettings = buildSettings({
            denebVersion: '1.10.0',
            providerVersion: '6.0.0',
            enableContextMenu: false,
            enableContextMenuSelector: true
        });
        setReadModePersistSuppressed(true);
        handlePropertyMigration(mockVisualSettings as never, true);

        // Values stay unchanged — the gate condition isn't met.
        expect(
            mockVisualSettings.vega.interactivity.enableContextMenu.value
        ).toBe(false);
        expect(
            mockVisualSettings.vega.interactivity.enableContextMenuSelector
                .value
        ).toBe(true);
    });

    it('applies in-memory remap on every read-mode update regardless of migrationCheckPerformed (sticky-flag bypass)', () => {
        // The migration slice's flag is a sticky cross-mode value. If a
        // prior edit-mode session flipped it true and the user closes
        // back to read, the read-mode path MUST still apply the in-memory
        // remap — otherwise the read render diverges from edit.
        mockMigrationCheckPerformed = true;
        mockVisualSettings = buildSettings({
            denebVersion: '1.9.0',
            providerVersion: '6.0.0',
            enableContextMenu: false,
            enableContextMenuSelector: true
        });
        setReadModePersistSuppressed(true);
        handlePropertyMigration(mockVisualSettings as never, true);

        expect(
            mockVisualSettings.vega.interactivity.enableContextMenu.value
        ).toBe(true);
        expect(
            mockVisualSettings.vega.interactivity.enableContextMenuSelector
                .value
        ).toBe(false);
        // And the flag stayed where it was — read mode never touches it.
        expect(mockUpdateMigrationDetails).not.toHaveBeenCalled();
    });
});
