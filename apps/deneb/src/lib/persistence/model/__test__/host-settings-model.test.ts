import { describe, expect, it, vi } from 'vitest';

// `migration.ts` imports `getDenebVisualState` from `../../state` (the
// visual's full Zustand store aggregator). That module pulls in slices
// this suite has no need to exercise; mocking it here avoids that
// transitive import entirely. None of the migration helpers this suite
// calls (`getStateManagementPayloadFromSettings`,
// `applyStateManagementPayloadToSettings`, `runStateManagementSchemaMigrations`)
// read from it - they only operate on the `HostSettingsModel` instance
// passed in directly.
vi.mock('../../../../state', () => ({
    getDenebVisualState: vi.fn(() => ({
        settings: undefined,
        updates: { options: undefined }
    }))
}));

// `SettingsDataLimit` (one of the generic cards) reads
// `INCREMENTAL_UPDATE_CONFIGURATION` from `@deneb-viz/app-core`, and
// `migration.ts` reads `getDenebState` from the same package. Neither is
// exercised by this suite's assertions - the mock exists only so
// constructing a real model instance doesn't require the app-core
// package's full runtime dependency graph.
vi.mock('@deneb-viz/app-core', () => ({
    INCREMENTAL_UPDATE_CONFIGURATION: {
        enabledDefault: false,
        defaultThreshold: 5000,
        minThreshold: 1000,
        maxThreshold: 50000
    },
    getDenebState: vi.fn(() => ({
        migration: {
            migrationCheckPerformed: false,
            updateMigrationDetails: vi.fn()
        }
    }))
}));

import { HostSettingsModel } from '../host-settings-model';
import { DEFAULTS } from '../constants';
import {
    applyStateManagementPayloadToSettings,
    getStateManagementPayloadFromSettings,
    runStateManagementSchemaMigrations
} from '../../migration';
import { VisualFormattingSettingsModel } from '../../../../app/visual-settings';

/**
 * Characterisation: today's composed model (`VisualFormattingSettingsModel`)
 * yields this exact card order (editor first, then the generic cards) and
 * this exact developer-mode visibility behaviour. The base/subclass split
 * is checked against these values so the split cannot silently change the
 * formatting-pane layout.
 */
describe('HostSettingsModel (base, no editor card)', () => {
    it('exposes only the generic cards, in pane order', () => {
        const model = new HostSettingsModel();
        expect(model.cards.map((card) => card.name)).toEqual([
            'display',
            'dataLimit',
            'stateManagement',
            'vega',
            'developer'
        ]);
    });

    it('has no editor property', () => {
        const model = new HostSettingsModel();
        expect(Object.prototype.hasOwnProperty.call(model, 'editor')).toBe(
            false
        );
    });

    it('runs the persistence/migration helpers used by handlePropertyMigration inputs without throwing or dereferencing an editor card', () => {
        const model = new HostSettingsModel();
        expect(() => {
            const payload = getStateManagementPayloadFromSettings(model);
            applyStateManagementPayloadToSettings(model, payload);
            runStateManagementSchemaMigrations(model);
        }).not.toThrow();
    });
});

describe('generic DEFAULTS', () => {
    it('no longer carries an editor key', () => {
        expect(Object.prototype.hasOwnProperty.call(DEFAULTS, 'editor')).toBe(
            false
        );
    });
});

describe('VisualFormattingSettingsModel (composed by the app)', () => {
    it('yields the card order: editor, display, dataLimit, stateManagement, vega, developer', () => {
        const model = new VisualFormattingSettingsModel();
        expect(model.cards.map((card) => card.name)).toEqual([
            'editor',
            'display',
            'dataLimit',
            'stateManagement',
            'vega',
            'developer'
        ]);
    });

    it('resolveDeveloperSettings(false) hides developer, vega and stateManagement', () => {
        const model = new VisualFormattingSettingsModel();
        model.resolveDeveloperSettings(false);
        expect(model.developer.visible).toBe(false);
        expect(model.vega.visible).toBe(false);
        expect(model.stateManagement.visible).toBe(false);
    });

    it('resolveDeveloperSettings(true) leaves developer, vega and stateManagement visible', () => {
        const model = new VisualFormattingSettingsModel();
        model.resolveDeveloperSettings(true);
        expect(model.developer.visible).not.toBe(false);
        expect(model.vega.visible).not.toBe(false);
        expect(model.stateManagement.visible).not.toBe(false);
    });
});
