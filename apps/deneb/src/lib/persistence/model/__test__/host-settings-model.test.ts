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

/**
 * Characterisation: the generic base model carries no app-contributed card
 * and exposes its cards in this exact pane order. An app's composed model
 * (e.g. the visual's `VisualFormattingSettingsModel`) extends this class
 * and adds its own card ahead of these — see `app/__test__/visual-settings.test.ts`
 * for that composition's characterisation.
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
    it('carries no editor key', () => {
        expect(Object.prototype.hasOwnProperty.call(DEFAULTS, 'editor')).toBe(
            false
        );
    });
});
