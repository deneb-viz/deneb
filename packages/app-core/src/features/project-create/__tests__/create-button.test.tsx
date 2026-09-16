import { describe, expect, it } from 'vitest';

import { createDenebState } from '../../../state/state';

/**
 * `CreateButton` (`../components/create-button.tsx`) only dispatches
 * `project.initializeFromTemplate`. Staging the text into Monaco and
 * requesting focus happens via the editor-side subscriptions the editor
 * package registers when it installs its slices.
 *
 * Component-tree rendering tests are deferred in this workspace (vitest
 * runs in the `node` environment with no `@testing-library/react` — see
 * `no-data-message.test.tsx`), so this test exercises the button's actual
 * remaining dependency directly: `project.initializeFromTemplate`, called
 * on a CORE-ONLY store (no editor slices, no Monaco, no
 * `SpecificationEditorProvider`). Passing here proves the button's create
 * flow does not need any editor context mounted.
 */
describe('CreateButton create flow — no editor context required', () => {
    it('initialises the project on a core-only store without throwing, with no editor/export/fieldUsage/commands slice present', () => {
        const store = createDenebState();
        expect('editor' in store.getState()).toBe(false);

        expect(() => {
            store.getState().project.initializeFromTemplate({
                spec: '{"mark":"bar"}',
                config: '{"padding":5}',
                provider: 'vegaLite',
                supportFieldConfiguration: {
                    Category: {
                        highlight: true,
                        format: false,
                        formatted: true
                    }
                },
                denebMetaVersion: 2,
                consolidateFieldParameters: true
            });
        }).not.toThrow();

        const state = store.getState();
        // Editor-only slices are absent on a core-only store — nothing in
        // the create flow required them.
        for (const key of ['editor', 'export', 'fieldUsage', 'commands']) {
            expect(key in state).toBe(false);
        }
    });

    it('sets the expected project state and increments initializationCount', () => {
        const store = createDenebState();
        expect(store.getState().project.initializationCount).toBe(0);

        store.getState().project.initializeFromTemplate({
            spec: '{"mark":"point"}',
            config: '{}',
            provider: 'vegaLite',
            supportFieldConfiguration: {
                Category: { highlight: true, format: false, formatted: true }
            },
            denebMetaVersion: 2
        });

        const { project } = store.getState();
        expect(project.spec).toBe('{"mark":"point"}');
        expect(project.config).toBe('{}');
        expect(project.provider).toBe('vegaLite');
        expect(project.__isInitialized__).toBe(true);
        expect(project.supportFieldConfiguration).toEqual({
            Category: { highlight: true, format: false, formatted: true }
        });
        // Bumped by exactly this action — the discriminator the
        // editor-side subscription uses to select the Spec pane and
        // request focus.
        expect(project.initializationCount).toBe(1);
    });
});
