import powerbi from 'powerbi-visuals-api';
import { describe, expect, it } from 'vitest';

import {
    doesModeAllowEmbedViewportSet,
    isReportInReadMode
} from '../display-mode';
import type { DisplayMode } from '../display-mode';

/**
 * Locks the full DisplayMode → boolean matrix for the embed-viewport
 * commit gate. The negative cases — `editor`, the two `transition-*`,
 * and `fetching` — share the same rationale: the host viewport at the
 * time of the update does not match the canvas size the viewer should
 * be rendered at, so committing it pollutes `interface.embedViewport`
 * and leaks the wrong dimensions into subsequent renders.
 *
 * `fetching` is the regression case fixed in concert with the
 * segmented-fetch interruption recovery: when a viewer↔editor
 * transition arrives mid-fetch, the host viewport is the editor's
 * full-screen area but the resolved mode is `fetching` (the transition
 * detector is masked by the stuck `isFetchingAdditional` flag).
 * Treating `fetching` as commit-safe — which is what the function used
 * to do — wrote that editor viewport into `embedViewport` and the
 * polluted value survived into viewer mode after recovery cleared the
 * stuck flag.
 */
describe('doesModeAllowEmbedViewportSet', () => {
    const cases: Array<{ mode: DisplayMode; expected: boolean }> = [
        // Allowed — modes where the host viewport is the correct
        // committed value for the embed canvas.
        { mode: 'initializing', expected: true },
        { mode: 'landing', expected: true },
        { mode: 'no-project', expected: true },
        { mode: 'viewer', expected: true },
        // Excluded — host viewport at this moment is wrong for the
        // viewer's eventual canvas. See JSDoc on the function for
        // per-mode rationale.
        { mode: 'editor', expected: false },
        { mode: 'transition-viewer-editor', expected: false },
        { mode: 'transition-editor-viewer', expected: false },
        { mode: 'fetching', expected: false }
    ];

    it.each(cases)(
        'returns $expected for mode "$mode"',
        ({ mode, expected }) => {
            expect(doesModeAllowEmbedViewportSet(mode)).toBe(expected);
        }
    );

    it('covers every DisplayMode value (exhaustiveness guard)', () => {
        // If a new DisplayMode is added to the union, this array literal
        // must include it; the type assertion below will fail to compile
        // (or the runtime length check will fail) and force the author
        // to make an explicit commit/exclude decision rather than
        // silently defaulting to "allowed".
        const allKnownModes: DisplayMode[] = [
            'initializing',
            'landing',
            'no-project',
            'fetching',
            'viewer',
            'transition-viewer-editor',
            'transition-editor-viewer',
            'editor'
        ];
        expect(cases.map((c) => c.mode).sort()).toEqual(
            [...allKnownModes].sort()
        );
    });
});

/**
 * `isReportInReadMode` is the authoritative gate the persistence
 * suppression layer consults: it must return true only when the report
 * is being consumed in read mode (a published or embedded report being
 * viewed, not authored). The Power BI `ViewMode` enum has three values
 * — View, Edit, InFocusEdit — and the test pins all three plus a
 * focus-mode-on-viewer scenario (which keeps `viewMode === View`).
 */
describe('isReportInReadMode', () => {
    // ViewMode enum values from powerbi-visuals-api. Hard-coded rather
    // than referenced as `powerbi.ViewMode.<name>` because the namespace
    // is shimmed in the test environment and const-enum lookups return
    // undefined. Matches the raw-numeric comparison used elsewhere in
    // display-mode.ts (e.g. `editMode === 1`).
    const VIEW_MODE_VIEW = 0 satisfies powerbi.ViewMode;
    const VIEW_MODE_EDIT = 1 satisfies powerbi.ViewMode;
    const VIEW_MODE_IN_FOCUS_EDIT = 2 satisfies powerbi.ViewMode;

    const buildOptions = (
        viewMode: powerbi.ViewMode,
        isInFocus = false
    ): powerbi.extensibility.visual.VisualUpdateOptions =>
        ({
            viewMode,
            isInFocus
        }) as powerbi.extensibility.visual.VisualUpdateOptions;

    it('returns true for ViewMode.View', () => {
        expect(isReportInReadMode(buildOptions(VIEW_MODE_VIEW))).toBe(true);
    });

    it('returns false for ViewMode.Edit', () => {
        expect(isReportInReadMode(buildOptions(VIEW_MODE_EDIT))).toBe(false);
    });

    it('returns false for ViewMode.InFocusEdit', () => {
        expect(isReportInReadMode(buildOptions(VIEW_MODE_IN_FOCUS_EDIT))).toBe(
            false
        );
    });

    it('treats focus mode on a viewer as read mode (viewMode stays View, isInFocus is true)', () => {
        expect(isReportInReadMode(buildOptions(VIEW_MODE_VIEW, true))).toBe(
            true
        );
    });
});
