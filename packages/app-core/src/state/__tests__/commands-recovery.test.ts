import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';

/**
 * Regression tests for the "compilation-gated commands stuck disabled
 * after parse-error click" bug. See
 * docs/plans/2026-04-29-001-fix-zoom-stuck-disabled-on-recovery-plan.md.
 *
 * Two command sets gate on `isCompilationReady`:
 *  - The four zoom controls (`zoomIn`, `zoomOut`, `zoomFit`, `zoomReset`),
 *    written by `handleUpdateEditorZoomLevel`.
 *  - `exportSpecification`, written by `handleUpdateChanges` and
 *    `handleUpdateIsDirty`.
 *
 * If the user takes a triggering action (zoom click / editor keystroke)
 * while compilation is in an error state, the writer evaluates the gate
 * with `isCompilationReady === false` and writes `false` into the
 * `commands` slice. `handleCompile` reaching `ready` does NOT currently
 * re-evaluate the gates, so the slice stays `false` until the user takes
 * the same triggering action again — at which point zoom buttons are
 * disabled, so the user can't trigger them. Deadlock.
 *
 * Unit 2 of the plan adds a conditional recovery write to `handleCompile`
 * that re-evaluates both gates on `result.status === 'ready'`. The
 * "REGRESSION GUARD" tests below FAIL before Unit 2 and PASS after.
 *
 * Critical fixture detail: the `compileSpec` mock in
 * `compilation-render-id.test.ts` deliberately omits `status` because that
 * file is asserting `renderId` does not change regardless of result shape.
 * For the recovery-write tests below, the success-case mock MUST include
 * `status: 'ready'` and a minimal `parsed` object so `isCompilationReady`
 * actually returns `true`. Without that, every test would pass for the
 * wrong reason (the recovery write would no-op even after the fix).
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
 * runtime.
 */
const makeStore = () => createDenebState({ applicationVersion: 'test' });

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

    it('initialises zoom command flags to true', () => {
        const store = makeStore();
        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('writes false for all zoom flags when a zoom click happens during a parse-error state', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);

        // Simulating the user clicking a zoom control while compilation
        // is in error: `handleZoomIn` -> `executeCommand` -> the slice
        // ultimately calls `updateEditorZoomLevel(level)`.
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: re-enables all zoom flags when handleCompile reaches a ready state after a parse-error click. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        // Step 1: enter error state and trigger the zoom write that
        // disables the flags.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);
        expect(store.getState().commands.zoomIn).toBe(false);

        // Step 2: a successful recompile. After Unit 2, `handleCompile`
        // re-evaluates the zoom gate and writes the four flags back.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
        // zoom level is mid-range, so all four should recover to true.
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('preserves zoom flags as true on recovery when no zoom click occurred during the error window', () => {
        const store = makeStore();

        // Error state but the user never clicked a zoom control.
        setCompilationResult(store, ERROR_RESULT);
        // Recovery.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('disables zoom flags when handleCompile produces an error result, even with no prior zoom click', () => {
        // Symmetry with exportSpecification: editor-edit writers fire
        // continuously and self-correct exportSpec on every keystroke during
        // an error state, so its disable feels "automatic." Zoom has only
        // one writer (`handleUpdateEditorZoomLevel`) which fires only on
        // user zoom interaction, so without this symmetric write in
        // handleCompile, zoom controls would look enabled in a known-bad
        // state until the user clicks them. This test guards the
        // handleCompile error-branch write that closes that gap.
        const store = makeStore();

        // Sanity: flags are true before any compile.
        expect(store.getState().commands.zoomIn).toBe(true);

        // Compile with an error result; no prior zoom click.
        vi.mocked(compileSpec).mockReturnValueOnce(ERROR_RESULT);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: zoom recovery is idempotent across repeated successful compiles. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
        store.getState().compilation.compile({} as never);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(true);
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('REGRESSION GUARD: re-disables zoom flags when a second error follows recovery and the user clicks again. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        // First error -> click -> recovery cycle.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);
        expect(store.getState().commands.zoomIn).toBe(true);

        // Second error -> click. Should disable again.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MID);

        const { commands } = store.getState();
        expect(commands.zoomIn).toBe(false);
        expect(commands.zoomOut).toBe(false);
        expect(commands.zoomFit).toBe(false);
        expect(commands.zoomReset).toBe(false);
    });

    it('REGRESSION GUARD: respects the zoom min boundary on recovery (zoomOut stays false at min, zoomIn re-enables). FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        // Trigger the disable at the min zoom level — `isZoomOutCommandEnabled`
        // returns false at min regardless of compilation state.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MIN);

        // Recovery — the helper must apply the boundary check, not just
        // restore everything to true.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
        expect(commands.zoomOut).toBe(false); // at min, can't zoom out
        expect(commands.zoomIn).toBe(true); // not at max, can zoom in
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('REGRESSION GUARD: respects the zoom max boundary on recovery (zoomIn stays false at max, zoomOut re-enables). FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        setCompilationResult(store, ERROR_RESULT);
        store.getState().updateEditorZoomLevel(ZOOM_MAX);

        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        const { commands } = store.getState();
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

    it('initialises exportSpecification to true', () => {
        const store = makeStore();
        expect(store.getState().commands.exportSpecification).toBe(true);
    });

    it('writes false for exportSpecification when an editor isDirty change happens during a parse-error state', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);

        // Simulating a keystroke that toggles dirty during error. The
        // gate is `!editorIsDirty && isCompilationReady` — both conditions
        // fail here, so the writer must produce false.
        store.getState().editor.updateIsDirty(true);

        expect(store.getState().commands.exportSpecification).toBe(false);
    });

    it('REGRESSION GUARD: re-enables exportSpecification when handleCompile reaches ready and editor is no longer dirty. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        // Step 1: error + dirty=true -> writer disables.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        expect(store.getState().commands.exportSpecification).toBe(false);

        // Step 2: editor reverts to clean (e.g. apply succeeded). The
        // writer fires again but compilation is still in error, so
        // exportSpec stays false. This is the deadlock window the
        // recovery write must close.
        store.getState().editor.updateIsDirty(false);
        expect(store.getState().commands.exportSpecification).toBe(false);

        // Step 3: successful recompile. With dirty=false and ready=true,
        // the recovery write must produce exportSpecification=true.
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        expect(store.getState().commands.exportSpecification).toBe(true);
    });

    it('preserves exportSpecification as true on recovery when no editor change occurred during the error window', () => {
        const store = makeStore();

        // No keystroke during the error -> the writer never fires ->
        // exportSpec stays at its initial true.
        setCompilationResult(store, ERROR_RESULT);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);

        expect(store.getState().commands.exportSpecification).toBe(true);
    });

    it('REGRESSION GUARD: exportSpecification recovery is idempotent across repeated successful compiles. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        store.getState().editor.updateIsDirty(false);

        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
        store.getState().compilation.compile({} as never);
        store.getState().compilation.compile({} as never);

        expect(store.getState().commands.exportSpecification).toBe(true);
    });

    it('REGRESSION GUARD: re-disables exportSpecification when a second error follows recovery and the editor goes dirty again. FAILS BEFORE UNIT 2; PASSES AFTER.', () => {
        const store = makeStore();

        // First error -> dirty -> apply -> recovery cycle.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);
        store.getState().editor.updateIsDirty(false);
        vi.mocked(compileSpec).mockReturnValueOnce(READY_RESULT);
        store.getState().compilation.compile({} as never);
        expect(store.getState().commands.exportSpecification).toBe(true);

        // Second error -> dirty. Should disable again.
        setCompilationResult(store, ERROR_RESULT);
        store.getState().editor.updateIsDirty(true);

        expect(store.getState().commands.exportSpecification).toBe(false);
    });
});
