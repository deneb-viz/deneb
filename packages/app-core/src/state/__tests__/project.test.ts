import { describe, expect, it } from 'vitest';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { createDenebState } from '../state';
import type { ProjectSyncPayload } from '../project';

/**
 * U3 (audit findings M10/M12) — project slice:
 *
 *  - M12: `__isInitialized__` is computed on the MERGED project state, not
 *    the partial sync payload. A partial inbound sync of an unrelated key
 *    (e.g. `logLevel`) on a brand-new visual must not flip initialization
 *    to true (which would suppress the Create-dialog auto-open).
 *  - M10: `applySupportFieldMigrationStamp` commits all three migration
 *    properties in a SINGLE store update, so the app-core → host sync
 *    subscriber observes exactly one project-slice change and emits one
 *    batched persist.
 */

/**
 * Build a fresh, fully-wired Deneb state store per test (same pattern as
 * commands-recovery.test.ts — the real store factory avoids circular-
 * import problems and exercises cross-slice writes as at runtime).
 */
const makeStore = () => createDenebState({ applicationVersion: 'test' });

/**
 * The sync layer passes partial payloads at runtime (only changed keys);
 * the declared type is the full DenebProject, so partials are cast.
 */
const partialSync = (payload: Record<string, unknown>) =>
    payload as unknown as ProjectSyncPayload;

describe('project slice — syncProjectData initialization (M12)', () => {
    it('keeps __isInitialized__ false when a partial sync of an unrelated key arrives on a brand-new visual', () => {
        const store = makeStore();
        expect(store.getState().project.__isInitialized__).toBe(false);

        store.getState().project.syncProjectData(partialSync({ logLevel: 3 }));

        const { project } = store.getState();
        expect(project.logLevel).toBe(3);
        expect(project.__hasHydrated__).toBe(true);
        // Before the M12 fix, `isProjectInitialized(payload)` saw
        // `spec === undefined !== PROJECT_DEFAULTS.spec` and flipped this
        // to true, suppressing the Create-dialog auto-open.
        expect(project.__isInitialized__).toBe(false);
    });

    it('sets __isInitialized__ true when the merged state carries real project content', () => {
        const store = makeStore();

        store
            .getState()
            .project.syncProjectData(partialSync({ spec: '{"mark":"bar"}' }));

        expect(store.getState().project.__isInitialized__).toBe(true);
    });

    it('keeps __isInitialized__ true across a later partial sync of an unrelated key', () => {
        const store = makeStore();

        store
            .getState()
            .project.syncProjectData(partialSync({ spec: '{"mark":"bar"}' }));
        store.getState().project.syncProjectData(partialSync({ logLevel: 1 }));

        const { project } = store.getState();
        expect(project.logLevel).toBe(1);
        // The merged state still has the non-default spec, so
        // initialization holds.
        expect(project.spec).toBe('{"mark":"bar"}');
        expect(project.__isInitialized__).toBe(true);
    });

    it('stays uninitialized when the synced content equals the factory defaults', () => {
        const store = makeStore();

        store.getState().project.syncProjectData(
            partialSync({
                spec: PROJECT_DEFAULTS.spec,
                config: PROJECT_DEFAULTS.config
            })
        );

        expect(store.getState().project.__isInitialized__).toBe(false);
    });
});

describe('project slice — applySupportFieldMigrationStamp (M10)', () => {
    const STAMP = {
        supportFieldConfiguration: {
            Category: {
                highlight: true,
                format: true,
                formatted: true
            }
        },
        denebMetaVersion: 2,
        consolidateFieldParameters: false
    };

    it('commits all three properties in a SINGLE store update (one project-slice change)', () => {
        const store = makeStore();
        let projectSliceChanges = 0;
        const unsubscribe = store.subscribe((state, previous) => {
            if (state.project !== previous.project) {
                projectSliceChanges += 1;
            }
        });

        store.getState().project.applySupportFieldMigrationStamp(STAMP);

        // Exactly one notification: the sync layer's app-core → host
        // subscriber fires once and emits one batched persist. Three
        // separate setter calls would notify three times → three
        // non-atomic host persists (M10's partial-persist split).
        expect(projectSliceChanges).toBe(1);
        unsubscribe();
    });

    it('applies the stamped values to the project slice', () => {
        const store = makeStore();

        store.getState().project.applySupportFieldMigrationStamp(STAMP);

        const { project } = store.getState();
        expect(project.supportFieldConfiguration).toEqual(
            STAMP.supportFieldConfiguration
        );
        expect(project.denebMetaVersion).toBe(2);
        expect(project.consolidateFieldParameters).toBe(false);
    });

    it('embeds the stamped configuration into export metadata dataset entries (parity with setSupportFieldConfiguration)', () => {
        const store = makeStore();
        // Seed an export dataset entry matching a configured field.
        store.setState((state) => ({
            export: {
                ...state.export,
                metadata: {
                    ...state.export.metadata!,
                    datasets: {
                        dataset: [
                            {
                                key: '__0__',
                                name: 'Category',
                                namePlaceholder: 'Category',
                                type: 'text'
                            }
                        ]
                    }
                }
            }
        }));

        store.getState().project.applySupportFieldMigrationStamp(STAMP);

        const entry = store.getState().export.metadata?.datasets?.dataset?.[0];
        expect(entry?.supportFieldConfiguration).toEqual(
            STAMP.supportFieldConfiguration.Category
        );
    });
});
