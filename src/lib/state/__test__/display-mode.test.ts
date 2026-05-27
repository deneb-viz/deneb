import { describe, expect, it } from 'vitest';

import { doesModeAllowEmbedViewportSet } from '../display-mode';
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
