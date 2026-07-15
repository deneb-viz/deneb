import { describe, expect, it } from 'vitest';
import { createDenebState } from '../state';
import type { monaco } from '../../lib/monaco/types';

/**
 * Editor slice — `updateChanges` view-state fallback.
 *
 * When a role is edited WITHOUT supplying a fresh Monaco view state, each
 * editor role must fall back to ITS OWN stored view state. A prior bug used
 * the active role's view state as the fallback for the OTHER role, so every
 * Spec keystroke overwrote the Config editor's saved cursor/scroll state (and
 * vice versa).
 */
const makeStore = () => createDenebState({ applicationVersion: 'test' });

const asViewState = (id: string) =>
    ({ __id: id }) as unknown as monaco.editor.ICodeEditorViewState;

describe('editor slice — updateChanges view-state fallback', () => {
    it('preserves the Config view state when updating the Spec editor (no cross-contamination)', () => {
        const store = makeStore();
        const configViewState = asViewState('config');
        const specViewState = asViewState('spec');
        store.setState((state) => ({
            editor: {
                ...state.editor,
                viewStateConfig: configViewState,
                viewStateSpec: specViewState
            }
        }));

        // Update the Spec editor WITHOUT supplying a new view state.
        store
            .getState()
            .editor.updateChanges({ role: 'Spec', text: 'new spec text' });

        const { viewStateConfig, viewStateSpec } = store.getState().editor;
        // The Config editor's saved state must be untouched by a Spec edit.
        expect(viewStateConfig).toBe(configViewState);
        // The Spec editor keeps its own stored state (none supplied).
        expect(viewStateSpec).toBe(specViewState);
    });

    it('preserves the Spec view state when updating the Config editor', () => {
        const store = makeStore();
        const configViewState = asViewState('config');
        const specViewState = asViewState('spec');
        store.setState((state) => ({
            editor: {
                ...state.editor,
                viewStateConfig: configViewState,
                viewStateSpec: specViewState
            }
        }));

        store
            .getState()
            .editor.updateChanges({ role: 'Config', text: 'new config text' });

        const { viewStateConfig, viewStateSpec } = store.getState().editor;
        expect(viewStateSpec).toBe(specViewState);
        expect(viewStateConfig).toBe(configViewState);
    });
});
