import { describe, expect, it } from 'vitest';

import { createDenebState } from '../../../state/state';
import { isEditorStateInstalled } from '../../../state/install-editor-state';

/**
 * `CreateButton` (`../components/create-button.tsx`) used to read
 * `useSpecificationEditor()` and push text into the Monaco refs directly
 * after dispatching `project.initializeFromTemplate`. U6
 * (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
 * removed that — the button now ONLY dispatches
 * `project.initializeFromTemplate`; staging the text into Monaco and
 * requesting focus moved to the editor-side subscriptions registered by
 * `installEditorState` (U5, `state/install-editor-state.ts`).
 *
 * Component-tree rendering tests are deferred in this workspace (vitest
 * runs in the `node` environment with no `@testing-library/react` — see
 * `no-data-message.test.tsx`), so this test exercises the button's actual
 * remaining dependency directly: `project.initializeFromTemplate`, called
 * on a CORE-ONLY store (no `installEditorState`, i.e. no editor slices, no
 * Monaco, no `SpecificationEditorProvider`). Passing here proves the
 * button's create flow no longer needs any editor context mounted — AE4.
 */
describe('CreateButton create flow — no editor context required (AE4)', () => {
    it('initialises the project on a core-only store without throwing, with no editor/export/fieldUsage/commands slice present', () => {
        const store = createDenebState({ applicationVersion: 'test' });
        expect(isEditorStateInstalled(store.getState())).toBe(false);

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
        // Editor-only slices installEditorState would have merged in are
        // absent — nothing in the create flow required them.
        for (const key of ['editor', 'export', 'fieldUsage', 'commands']) {
            expect(key in state).toBe(false);
        }
    });

    it('sets the expected project state and increments initializationCount', () => {
        const store = createDenebState({ applicationVersion: 'test' });
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
        // Bumped by exactly this action — the discriminator the U5
        // editor-side subscription uses to select the Spec pane and
        // request focus, replacing what CreateButton used to do itself
        // via direct Monaco ref calls.
        expect(project.initializationCount).toBe(1);
    });
});
