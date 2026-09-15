import { describe, expect, it } from 'vitest';

import { createDenebState } from '../../../state/state';
import { installEditorState } from '../../../state/install-editor-state';
import { resolveStagedTextForRole } from '../staged-text';

/**
 * `resolveStagedTextForRole` (`../staged-text.ts`) is the pure function
 * extracted from `specification-json-editor.tsx`'s
 * `project.initializationCount` sync effect and `getDefaultValue` — both
 * used to independently compute "staged text if present, else the
 * persisted project text" for a given editor role. These tests exercise
 * the extracted function directly, against a real store, mirroring the
 * store-construction pattern used elsewhere in this workspace (vitest
 * runs in the `node` environment with no `@testing-library/react`, so
 * component-tree rendering is out of scope here — see
 * `lib/commands/__tests__/selectors.test.ts`,
 * `features/project-create/__tests__/create-button.test.tsx`).
 */

const makeStore = () => {
    const store = createDenebState();
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

describe('resolveStagedTextForRole', () => {
    it('returns the staged spec text for the Spec role when staged text is present', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, stagedSpec: '{"mark":"staged-spec"}' },
            project: { ...state.project, spec: '{"mark":"project-spec"}' }
        }));

        expect(resolveStagedTextForRole('Spec', store.getState())).toBe(
            '{"mark":"staged-spec"}'
        );
    });

    it('falls back to project.spec for the Spec role when no staged text is present', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, stagedSpec: undefined },
            project: { ...state.project, spec: '{"mark":"project-spec"}' }
        }));

        expect(resolveStagedTextForRole('Spec', store.getState())).toBe(
            '{"mark":"project-spec"}'
        );
    });

    it('returns the staged config text for the Config role when staged text is present', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, stagedConfig: '{"padding":9}' },
            project: { ...state.project, config: '{"padding":1}' }
        }));

        expect(resolveStagedTextForRole('Config', store.getState())).toBe(
            '{"padding":9}'
        );
    });

    it('falls back to project.config for the Config role when no staged text is present', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, stagedConfig: undefined },
            project: { ...state.project, config: '{"padding":1}' }
        }));

        expect(resolveStagedTextForRole('Config', store.getState())).toBe(
            '{"padding":1}'
        );
    });

    it('returns the newly staged text for both roles after initializeFromTemplate on an installed store', () => {
        const store = makeStore();

        // `initializeFromTemplate` bumps `project.contentCommitCount` in
        // the same `set()` call that updates `project.spec`/`config`,
        // which triggers the staged-text subscription registered by
        // `installEditorState` (`state/install-editor-state.ts`) to write
        // the new text into `editor.stagedSpec`/`stagedConfig` — this is
        // the real end-to-end path `specification-json-editor.tsx` relies
        // on, not a hand-constructed `setState`.
        store.getState().project.initializeFromTemplate({
            spec: '{"mark":"new-spec"}',
            config: '{"padding":42}',
            provider: 'vegaLite'
        });

        const state = store.getState();
        expect(resolveStagedTextForRole('Spec', state)).toBe(
            '{"mark":"new-spec"}'
        );
        expect(resolveStagedTextForRole('Config', state)).toBe(
            '{"padding":42}'
        );
    });
});
