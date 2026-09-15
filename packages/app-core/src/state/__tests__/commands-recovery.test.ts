import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';

/**
 * Regression tests for the "compilation-gated commands stuck disabled
 * after parse-error click" bug. See
 * docs/plans/2026-04-29-001-fix-zoom-stuck-disabled-on-recovery-plan.md.
 *
 * Two command sets gate on `isCompilationReady`:
 *  - The four zoom controls (`zoomIn`, `zoomOut`, `zoomFit`, `zoomReset`).
 *  - `exportSpecification`.
 *
 * Originally (docs/plans/2026-04-29-001-...), the fix was a recovery write
 * inside `handleCompile` that re-evaluated both gates whenever compilation
 * reached `ready`, so a stale `false` written during a parse error would
 * clear on the next successful compile even without a fresh zoom
 * click/keystroke.
 *
 * U4 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
 * removed that recovery write from `handleCompile`, and a later cleanup
 * pass removed the equivalent writes from `handleUpdateEditorZoomLevel` and
 * `handleUpdateChanges`/`handleUpdateIsDirty` (state/editor.ts) too — none
 * of these five commands are written into `state.commands` any more. The
 * gates are *derived on read* via `selectZoomCommandsState` /
 * `selectExportSpecificationCommandEnabled` (lib/commands/selectors.ts),
 * computed fresh from `compilation.result` / `editor.isDirty` /
 * `editorZoomLevel` every time — there is no stored flag left to go stale,
 * so the "stuck disabled" bug this file guards against is now structurally
 * impossible rather than fixed-by-write. Every test below asserts the
 * selector output instead of `state.commands.*` for that reason.
 */

const READY_RESULT: CompilationResult = {
    status: 'ready',
    parsed: {} as never,
    embedOptions: {}
};
const ERROR_RESULT: CompilationResult = {
    status: 'error',
    parsed: {} as never,
    embedOptions: {},
    errors: ['boom']
};

vi.mock('@deneb-viz/vega-runtime/compilation', async () => {
    const actual = await vi.importActual<
        typeof import('@deneb-viz/vega-runtime/compilation')
    >('@deneb-viz/vega-runtime/compilation');
    return {
        ...actual,
        compileSpec: vi.fn(() => READY_RESULT)
    };
});

import { compileSpec } from '@deneb-viz/vega-runtime/compilation';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { createDenebState } from '../state';
import { installEditorState } from '../install-editor-state';
import {
    selectExportSpecificationCommandEnabled,
    selectZoomCommandsState
} from '../../lib/commands/selectors';

// Source the boundaries from the same configuration constant the
// predicates use. Mirrors the sibling helper-unit test in
// `lib/commands/__tests__/state.test.ts` and keeps boundary assertions
// in sync with config changes automatically.
const ZOOM_MIN = VISUAL_PREVIEW_ZOOM_CONFIGURATION.min;
const ZOOM_MAX = VISUAL_PREVIEW_ZOOM_CONFIGURATION.max;
const ZOOM_MID = VISUAL_PREVIEW_ZOOM_CONFIGURATION.default;

/**
 * Build a fresh, fully-wired Deneb state store per test. Using the real
 * store factory rather than hand-rolling slice composition avoids the
 * circular-import problem (`editor.ts` imports `StoreState` from
 * `./state`) and ensures cross-slice writes work the same way they do at
 * runtime. `createDenebState` only assembles core slices now, so
 * `installEditorState` merges the editor-only slices (commands, debug,
 * editor, export, fieldUsage, settingsPane) in immediately after —
 * these tests exercise commands, which is editor-only.
 */
const makeStore = () => {
    const store = createDenebState();
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

/**
 * Force the compilation result into a non-ready state without going
 * through the `compile()` action. Used to set up the error precondition
 * that the triggering writer reads.
 */
const setCompilationResult = (
    store: ReturnType<typeof makeStore>,
    result: CompilationResult | null
) => {
    store.setState((s) => ({
        compilation: { ...s.compilation, result }
    }));
};

describe('commands recovery — zoom controls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
    });

    it('derives all zoom command flags disabled before any compilation has occurred', () => {
        // `isCompilationReady` gates every zoom command on
        // `compilation.result`, which is `null` until the first compile —
        // a freshly-created store (no stored default any more) therefore
        // derives every zoom command disabled, matching what the UI has
        // shown since U4 made every reader go through this selector.
        const store = makeStore();
        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('derives all zoom flags disabled when a zoom click happens during a parse-error state', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);

        // Simulating the user clicking a zoom control while compilation
        // is in error: `handleZoomIn` -> `executeCommand` -> the slice
        // ultimately calls `updateEditorZoomLevel(level)`, which updates
        // `editorZoomLevel` only. The selector derives the disabled state
        // from the current (error) `compilation.result`.
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: derives all zoom flags enabled after handleCompile reaches a ready state following a parse-error click', () => {
        const store = makeStore();

        // Step 1: enter error state and trigger the zoom level change.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);
        expect(selectZoomCommandsState(store.getState()).zoomIn).toBe(false);

        // Step 2: a successful recompile. `handleCompile` does not write
        // `commands` any more — the selector derives fresh from the new
        // `compilation.result` and the current `editorZoomLevel`.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        // zoom level is mid-range, so all four should read enabled.
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('derives zoom flags enabled after recovery when no zoom click occurred during the error window', () => {
        const store = makeStore();

        // Error state but the user never clicked a zoom control.
        setCompilationResult(store, ERROR_RESULT);
        // Recovery.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('derives zoom flags disabled when handleCompile produces an error result, even with no prior zoom click', () => {
        // Symmetry with exportSpecification: since both are now purely
        // derived from `compilation.result`, an error result disables both
        // regardless of which writer (if any) last fired.
        const store = makeStore();

        // Sanity: flags read enabled before any compile (default zoom
        // level, but no result yet either — see the standalone "no
        // compilation result" case in lib/commands/__tests__/selectors.test.ts
        // for that edge; here we only care about the post-error state).
        vi.mocked(compileSpec).mockReturnValueOnce(ERROR_RESULT);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: zoom recovery is idempotent across repeated successful compiles', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
        store.getState().compilation.compile({} as never);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('REGRESSION GUARD: derives zoom flags disabled again when a second error follows recovery and the user clicks again', () => {
        const store = makeStore();

        // First error -> click -> recovery cycle.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);
        expect(selectZoomCommandsState(store.getState()).zoomIn).toBe(true);

        // Second error -> click. Should read disabled again (the click
        // still goes through `handleUpdateEditorZoomLevel`'s own write,
        // and the selector derives the same result from the fresh error).
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: respects the zoom min boundary on recovery (zoomOut stays false at min, zoomIn re-enables)', () => {
        const store = makeStore();

        // Trigger the disable at the min zoom level — `isZoomOutCommandEnabled`
        // returns false at min regardless of compilation state.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MIN);

        // Recovery — the helper must apply the boundary check, not just
        // derive everything as enabled.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomOut).toBe(false); // at min, can't zoom out
        expect(commands.zoomIn).toBe(true); // not at max, can zoom in
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('REGRESSION GUARD: respects the zoom max boundary on recovery (zoomIn stays false at max, zoomOut re-enables)', () => {
        const store = makeStore();

        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MAX);

        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false); // at max, can't zoom in
        expect(commands.zoomOut).toBe(true); // not at min, can zoom out
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });
});

describe('commands recovery — exportSpecification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
    });

    it('derives exportSpecification disabled before any compilation has occurred', () => {
        // Same reasoning as the zoom-controls case above: `isCompilationReady`
        // gates on `compilation.result`, which is `null` until the first
        // compile, so a freshly-created store derives exportSpecification
        // disabled regardless of the (clean) editor.isDirty default.
        const store = makeStore();
        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });

    it('derives exportSpecification disabled when an editor isDirty change happens during a parse-error state', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);

        // Simulating a keystroke that toggles dirty during error. The
        // gate is `!editorIsDirty && isCompilationReady` — both conditions
        // fail here, so the selector must derive false. `updateIsDirty`
        // updates `editor.isDirty` only.
        store.getState().editor.updateIsDirty(true);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });

    it('REGRESSION GUARD: derives exportSpecification enabled when handleCompile reaches ready and editor is no longer dirty', () => {
        const store = makeStore();

        // Step 1: error + dirty=true -> derives disabled.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);

        // Step 2: editor reverts to clean (e.g. apply succeeded), but
        // compilation is still in error, so the selector still derives
        // false.
        store.getState().editor.updateIsDirty(false);
        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);

        // Step 3: successful recompile. `handleCompile` does not write
        // `commands` any more — the selector derives fresh from the new
        // `compilation.result` and the current `editor.isDirty`, so with
        // dirty=false and ready=true it reads enabled.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);
    });

    it('derives exportSpecification enabled after recovery when no editor change occurred during the error window', () => {
        const store = makeStore();

        // No keystroke during the error -> the writer never fires.
        setCompilationResult(store, ERROR_RESULT);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);
    });

    it('REGRESSION GUARD: exportSpecification recovery is idempotent across repeated successful compiles', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        store.getState().editor.updateIsDirty(false);

        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
        store.getState().compilation.compile({} as never);
        store.getState().compilation.compile({} as never);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);
    });

    it('REGRESSION GUARD: derives exportSpecification disabled again when a second error follows recovery and the editor goes dirty again', () => {
        const store = makeStore();

        // First error -> dirty -> apply -> recovery cycle.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        store.getState().editor.updateIsDirty(false);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);
        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);

        // Second error -> dirty. Should read disabled again (the dirty
        // change still goes through `handleUpdateIsDirty`'s own write,
        // and the selector derives the same result from the fresh error).
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });
});
