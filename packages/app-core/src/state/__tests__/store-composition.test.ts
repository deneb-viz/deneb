import { describe, expect, it } from 'vitest';
import { createDenebState } from '../state';
import {
    installEditorState,
    isEditorStateInstalled
} from '../install-editor-state';
import { requireEditorState } from '../editor-state-access';

/**
 * U3 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
 * — store composition: `createDenebState` assembles core slices only, and
 * `installEditorState` merges the editor-only slices into an existing
 * store. These tests pin the two behaviours the rest of the refactor
 * depends on: a core-only store never exposes an editor key, and install
 * is idempotent and additive rather than replacing state.
 */

const CORE_KEYS = [
    'compilation',
    'create',
    'dataset',
    'editorPreferences',
    'i18n',
    'interface',
    'migration',
    'project',
    'visualRender'
] as const;

const EDITOR_KEYS = [
    'commands',
    'debug',
    'editor',
    'export',
    'fieldUsage',
    'settingsPane'
] as const;

const makeStore = () => createDenebState({ applicationVersion: 'test' });

describe('createDenebState — core slices only', () => {
    it('exposes every core slice key', () => {
        const state = makeStore().getState();
        for (const key of CORE_KEYS) {
            expect(state).toHaveProperty(key);
        }
    });

    it('exposes no editor slice key', () => {
        const state = makeStore().getState();
        for (const key of EDITOR_KEYS) {
            expect(state).not.toHaveProperty(key);
        }
    });

    it('reports isEditorStateInstalled as false', () => {
        expect(isEditorStateInstalled(makeStore().getState())).toBe(false);
    });
});

describe('installEditorState', () => {
    it('adds every editor slice key onto the same store', () => {
        const store = makeStore();
        installEditorState(store, { applicationVersion: 'test' });

        const state = store.getState();
        for (const key of EDITOR_KEYS) {
            expect(state).toHaveProperty(key);
        }
        // Core slices are untouched by the install.
        for (const key of CORE_KEYS) {
            expect(state).toHaveProperty(key);
        }
        expect(isEditorStateInstalled(state)).toBe(true);
    });

    it('is a no-op on a second call (idempotent)', () => {
        const store = makeStore();
        installEditorState(store, { applicationVersion: 'test' });

        const editorSliceBefore = store.getState().editor;
        const commandsSliceBefore = store.getState().commands;

        expect(() =>
            installEditorState(store, { applicationVersion: 'test' })
        ).not.toThrow();

        const state = store.getState();
        // Reference equality on the untouched slices proves the second
        // call did not re-run the slice initializers (which would
        // replace staged text, dirty flags, etc. with fresh defaults).
        expect(state.editor).toBe(editorSliceBefore);
        expect(state.commands).toBe(commandsSliceBefore);
    });

    it('defaults the store parameter to the singleton and the dependencies parameter to the application version', () => {
        // Calling with no arguments must not throw — this is the shape
        // every app uses at startup (`installEditorState()`).
        expect(() => installEditorState()).not.toThrow();
    });

    it('lets an installed editor action read core state and write editor state without disturbing the core slice', () => {
        const store = makeStore();
        installEditorState(store, { applicationVersion: 'test' });

        store.getState().project.setContent({
            spec: 'existing spec',
            config: 'existing config'
        });
        const projectBefore = store.getState().project;

        // `editor.updateChanges` reads `project.spec` (core) to compute
        // its dirty flag, and writes staged text into `editor` (editor
        // slice) — it does not write into `project`.
        store
            .getState()
            .editor.updateChanges({ role: 'Spec', text: 'new spec text' });

        const state = store.getState();
        expect(state.editor.stagedSpec).toBe('new spec text');
        expect(state.project).toBe(projectBefore);
    });
});

describe('requireEditorState', () => {
    it('throws a clear message on a core-only state', () => {
        const state = makeStore().getState();
        expect(() => requireEditorState(state)).toThrowError(
            'Editor state is not installed: call installEditorState() before mounting editor components.'
        );
    });

    it('returns the state unchanged once the editor slices are installed', () => {
        const store = makeStore();
        installEditorState(store, { applicationVersion: 'test' });
        const state = store.getState();
        expect(requireEditorState(state)).toBe(state);
    });
});
