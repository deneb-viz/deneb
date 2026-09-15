import { describe, expect, it } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';

import { createDenebState } from '../../../state/state';
import { installEditorState } from '../../../state/install-editor-state';
import {
    selectCommandEnabled,
    selectExportSpecificationCommandEnabled,
    selectZoomCommandsState
} from '../selectors';
import { type Command, type DerivedCommand } from '../types';

/**
 * U4 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
 * — selector tests for the export/zoom command enablement that used to be
 * written into `commands` by `handleCompile` (state/compilation.ts) and
 * `handleApplyTrackingChanges` (state/field-usage.ts). Both selectors are
 * thin wrappers over the same pure helpers (`evaluateExportSpecCommandState`,
 * `evaluateZoomCommandsState` in lib/commands/state.ts) already unit-tested
 * in isolation in `__tests__/state.test.ts`; these tests exercise them
 * through the selector, against a real store, over the same input
 * combinations `state/__tests__/cross-slice-writes.characterization.test.ts`
 * (U2) and `state/__tests__/commands-recovery.test.ts` captured: dirty vs.
 * clean editor, a ready vs. absent compilation result, and zoom level at
 * the min/mid/max boundaries.
 */

const READY_RESULT: CompilationResult = {
    status: 'ready',
    parsed: {} as never,
    embedOptions: {}
};

const ZOOM_MIN = VISUAL_PREVIEW_ZOOM_CONFIGURATION.min;
const ZOOM_MAX = VISUAL_PREVIEW_ZOOM_CONFIGURATION.max;
const ZOOM_MID = VISUAL_PREVIEW_ZOOM_CONFIGURATION.default;

/**
 * Fresh, fully-wired store per test — same pattern as the U2 characterization
 * and commands-recovery suites. `createDenebState` only assembles core
 * slices now, so `installEditorState` merges the editor-only slices
 * (`editor`, `compilation` is already core) in immediately.
 */
const makeStore = () => {
    const store = createDenebState();
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

describe('selectExportSpecificationCommandEnabled', () => {
    it('is disabled when the editor is dirty and the compilation result is ready', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, isDirty: true },
            compilation: { ...state.compilation, result: READY_RESULT }
        }));

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
        ).toEqual({ exportSpecification: false });
    });

    it('is enabled when the editor is clean and the compilation result is ready', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, isDirty: false },
            compilation: { ...state.compilation, result: READY_RESULT }
        }));

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
        ).toEqual({ exportSpecification: true });
    });

    it('is disabled when there is no compilation result, even with a clean editor', () => {
        const store = makeStore();
        store.setState((state) => ({
            editor: { ...state.editor, isDirty: false },
            compilation: { ...state.compilation, result: null }
        }));

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
        ).toEqual({ exportSpecification: false });
    });
});

describe('selectZoomCommandsState', () => {
    it('enables all four zoom commands at a mid-range zoom level with a ready compilation result', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: READY_RESULT }
        }));
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        expect(selectZoomCommandsState(store.getState())).toEqual({
            zoomFit: true,
            zoomIn: true,
            zoomOut: true,
            zoomReset: true
        });
    });

    it('disables zoomOut at the min zoom boundary with a ready compilation result', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: READY_RESULT }
        }));
        store.getState().updateEditorZoomLevel(ZOOM_MIN);

        expect(selectZoomCommandsState(store.getState())).toEqual({
            zoomFit: true,
            zoomIn: true,
            zoomOut: false,
            zoomReset: true
        });
    });

    it('disables zoomIn at the max zoom boundary with a ready compilation result', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: READY_RESULT }
        }));
        store.getState().updateEditorZoomLevel(ZOOM_MAX);

        expect(selectZoomCommandsState(store.getState())).toEqual({
            zoomFit: true,
            zoomIn: false,
            zoomOut: true,
            zoomReset: true
        });
    });

    it('disables all four zoom commands when there is no compilation result, regardless of zoom level', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: null }
        }));
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        expect(selectZoomCommandsState(store.getState())).toEqual({
            zoomFit: false,
            zoomIn: false,
            zoomOut: false,
            zoomReset: false
        });
    });
});

/**
 * `selectCommandEnabled` (lib/commands/selectors.ts) is the single
 * dispatch point that resolves a command's enabled state regardless of
 * whether it's derived (export/zoom, via the selectors above) or stored
 * (`state.commands`, written by e.g. `toggleApplyMode` in
 * `state/editor.ts`). These tests exercise that dispatch directly, rather
 * than re-testing the derivation logic already covered above.
 */
describe('selectCommandEnabled', () => {
    describe('stored commands', () => {
        it('returns the stored boolean for a stored command (applyChanges) and reflects a change made via setState', () => {
            const store = makeStore();

            // Initial stored value (state/commands.ts).
            expect(selectCommandEnabled(store.getState(), 'applyChanges')).toBe(
                true
            );

            store.setState((state) => ({
                commands: { ...state.commands, applyChanges: false }
            }));

            expect(selectCommandEnabled(store.getState(), 'applyChanges')).toBe(
                false
            );
        });

        it('returns the stored boolean for a stored command (applyChanges) and reflects a change made via its setter (toggleApplyMode)', () => {
            const store = makeStore();

            // `toggleApplyMode` (state/editor.ts, `handleToggleApplyMode`)
            // flips `editor.applyMode` and writes the corresponding
            // `commands.applyChanges` value in the same `set()` call.
            // Default `applyMode` is 'Manual', so the first toggle moves
            // to 'Auto' and sets `applyChanges` to false.
            expect(selectCommandEnabled(store.getState(), 'applyChanges')).toBe(
                true
            );

            store.getState().editor.toggleApplyMode();

            expect(selectCommandEnabled(store.getState(), 'applyChanges')).toBe(
                false
            );
        });
    });

    describe('derived commands', () => {
        it('returns the selector-derived value for exportSpecification, not any value written to state.commands, and reacts to editor.isDirty/compilation.result changes', () => {
            const store = makeStore();
            store.setState((state) => ({
                editor: { ...state.editor, isDirty: true },
                compilation: { ...state.compilation, result: READY_RESULT },
                // `exportSpecification` is a `DerivedCommand`
                // (lib/commands/types.ts) — `CommandsSliceProperties`
                // (state/commands.ts) excludes it, so nothing writes it
                // there in real code. This cast simulates a stale/wrong
                // stored value purely to prove `selectCommandEnabled`
                // never reads it for a derived command.
                commands: {
                    ...state.commands,
                    exportSpecification: true
                } as unknown as typeof state.commands
            }));

            // Dirty editor -> derived value is false, even though the
            // simulated stored value says true.
            expect(
                selectCommandEnabled(store.getState(), 'exportSpecification')
            ).toBe(false);

            store.setState((state) => ({
                editor: { ...state.editor, isDirty: false }
            }));
            expect(
                selectCommandEnabled(store.getState(), 'exportSpecification')
            ).toBe(true);

            store.setState((state) => ({
                compilation: { ...state.compilation, result: null }
            }));
            expect(
                selectCommandEnabled(store.getState(), 'exportSpecification')
            ).toBe(false);
        });

        it('returns the selector-derived value for zoomIn, not any value written to state.commands, and reacts to editorZoomLevel changes', () => {
            const store = makeStore();
            store.setState((state) => ({
                compilation: { ...state.compilation, result: READY_RESULT },
                // Simulated stale stored value — see the comment in the
                // exportSpecification test above.
                commands: {
                    ...state.commands,
                    zoomIn: false
                } as unknown as typeof state.commands
            }));

            store.getState().updateEditorZoomLevel(ZOOM_MID);
            expect(selectCommandEnabled(store.getState(), 'zoomIn')).toBe(true);

            store.getState().updateEditorZoomLevel(ZOOM_MAX);
            expect(selectCommandEnabled(store.getState(), 'zoomIn')).toBe(
                false
            );
        });
    });

    describe('sanity coverage over every Command', () => {
        it('returns a boolean for every member of the Command union, on an installed store', () => {
            const store = makeStore();
            store.setState((state) => ({
                compilation: { ...state.compilation, result: READY_RESULT }
            }));

            const derivedCommands: DerivedCommand[] = [
                'exportSpecification',
                'zoomFit',
                'zoomIn',
                'zoomOut',
                'zoomReset'
            ];

            // `Command` (lib/commands/types.ts) has no runtime list.
            // Build one from the stored-commands slice's initial keys
            // (state/commands.ts, `createCommandsSlice`) plus the derived
            // commands above — together these are exactly the values
            // `selectCommandEnabled`'s switch dispatches over.
            const storedCommands = Object.keys(
                store.getState().commands
            ) as Array<Exclude<Command, DerivedCommand>>;

            const allCommands: Command[] = [
                ...storedCommands,
                ...derivedCommands
            ];

            expect(allCommands.length).toBeGreaterThan(0);
            allCommands.forEach((command) => {
                expect(
                    typeof selectCommandEnabled(store.getState(), command)
                ).toBe('boolean');
            });
        });
    });
});
