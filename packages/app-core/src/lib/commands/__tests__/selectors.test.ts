import { describe, expect, it } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';

import { createDenebState } from '../../../state/state';
import { installEditorState } from '../../../state/install-editor-state';
import {
    selectExportSpecificationCommandEnabled,
    selectZoomCommandsState
} from '../selectors';

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
