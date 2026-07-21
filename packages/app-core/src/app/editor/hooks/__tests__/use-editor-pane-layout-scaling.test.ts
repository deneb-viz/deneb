import { describe, expect, it } from 'vitest';

import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { scalePaneSizesForContainerResize } from '../pane-layout-helpers';

/**
 * Pure-helper tests for the proportional pane-rescaling math that
 * `useEditorPaneLayout` runs whenever the container resizes after its
 * one-shot hydration.
 *
 * Bug being guarded against: the host iframe in Power BI expands in stages
 * after the editor opens. The hook's hydration `useLayoutEffect` is gated by
 * `!hasHydratedViewports` and fires on the first `(containerWidth > 0 &&
 * containerHeight > 0)` measurement - which can be a mid-expansion partial
 * size. Without this rescale, the store keeps the partial-size pane values
 * for the rest of the session, and downstream consumers that read pane sizes
 * from the store (notably `getZoomToFitScale`) compute Fit against stale,
 * tiny preview area dimensions. The user-visible symptom was Fit landing on
 * ~44% with a fully-expanded ~881x674 preview area visible on screen - the
 * math was correct, the inputs were wrong.
 *
 * These tests pin the math: width and height scale independently and
 * proportionally; editor + preview widths sum to the new container width
 * (modulo rounding); preview + debug heights sum to the new container height
 * (modulo rounding); user-dragged ratios survive a resize; the right pane is
 * clamped to `DEBUG_PANE_CONFIGURATION.minWidth` so the store stays in sync
 * with the same minSize Allotment enforces on render; and the latch height
 * goes through `getDebugPaneLatchHeight` so its semantics (freeze while
 * minimized, areaMinSize fallback) apply uniformly across hydrate, drag, and
 * rescale paths.
 */

const MIN_RIGHT_WIDTH = DEBUG_PANE_CONFIGURATION.minWidth; // 525

describe('scalePaneSizesForContainerResize', () => {
    it('returns sizes that sum to the new container dimensions (width axis)', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 2000, height: 800 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(
            result.editorPaneViewport.width +
                result.previewAreaViewport.width
        ).toBe(2000);
    });

    it('returns sizes that sum to the new container dimensions (height axis)', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 1500, height: 1200 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(
            result.previewAreaViewport.height +
                result.debugPaneViewport.height
        ).toBe(1200);
    });

    it('doubling both container dimensions doubles all pane dimensions', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 3000, height: 1600 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.editorPaneViewport).toEqual({
            width: 1200,
            height: 1600
        });
        expect(result.previewAreaViewport).toEqual({
            width: 1800,
            height: 960
        });
        expect(result.debugPaneViewport).toEqual({
            width: 1800,
            height: 640
        });
        // Not minimized + debug height >= areaMinSize ⇒ latch follows debug height
        expect(result.debugPaneLatchHeight).toBe(640);
    });

    it('preserves the editor-pane-width-to-container-width ratio after resize', () => {
        // Editor takes 40% of container width pre-resize; verify the same
        // ratio holds post-resize so user-dragged splits survive.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 2500, height: 800 },
            editorPaneWidth: 600, // 40% of 1500
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.editorPaneViewport.width / 2500).toBeCloseTo(0.4, 2);
    });

    it('preserves the preview-height-to-container-height ratio after resize', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 1500, height: 1100 },
            editorPaneWidth: 600,
            previewAreaHeight: 480, // 60% of 800
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.previewAreaViewport.height / 1100).toBeCloseTo(0.6, 2);
    });

    it('rescales asymmetrically - width-only change leaves heights untouched', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 2000, height: 800 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.previewAreaViewport.height).toBe(480);
        expect(result.debugPaneViewport.height).toBe(320);
        expect(result.debugPaneLatchHeight).toBe(320);
    });

    it('rescales asymmetrically - height-only change leaves widths untouched', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 1500, height: 1200 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.editorPaneViewport.width).toBe(600);
        expect(result.previewAreaViewport.width).toBe(900);
        expect(result.debugPaneViewport.width).toBe(900);
    });

    it('produces sizes that match the user-reported repro after settling', () => {
        // Captured state from the bug report:
        //   - At Fit click: previewAreaViewport={415,179},
        //     editorPaneViewport=(rest of container width), container settles
        //     to ~1480x900 from a partial ~692x300 hydration.
        //   - After this rescale, previewAreaViewport should be close to the
        //     post-settle ~881x674 that the user observed in state once the
        //     iframe stopped expanding.
        // This characterises that the rescale recovers a usable Fit input
        // even when hydration captured a tiny partial size.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 692, height: 300 },
            current: { width: 1480, height: 1124 },
            // editor=277 (40% of 692), preview=415 (60% of 692)
            // previewH=179 (~60% of 300), debugH=121 (~40% of 300)
            editorPaneWidth: 277,
            previewAreaHeight: 179,
            debugPaneLatchHeight: 121,
            isDebugPaneMinimized: false
        });
        // 277/692 ≈ 0.4; preserved against 1480 ⇒ ~592 editor, ~888 preview
        expect(result.editorPaneViewport.width).toBeGreaterThanOrEqual(580);
        expect(result.editorPaneViewport.width).toBeLessThanOrEqual(600);
        expect(result.previewAreaViewport.width).toBeGreaterThanOrEqual(880);
        expect(result.previewAreaViewport.width).toBeLessThanOrEqual(900);
        // 179/300 ≈ 0.597; preserved against 1124 ⇒ ~670 preview height
        expect(result.previewAreaViewport.height).toBeGreaterThanOrEqual(660);
        expect(result.previewAreaViewport.height).toBeLessThanOrEqual(680);
    });

    it('preview pane absorbs rounding error so width axis still sums exactly', () => {
        // Pick numbers that force Math.round to introduce a 1px discrepancy
        // on the editor pane, and verify the preview absorbs it rather than
        // the totals desyncing from the container. Container widths kept
        // well above DEBUG_PANE_CONFIGURATION.minWidth so the rounding-only
        // property is isolated from the minSize clamp.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 3000, height: 100 },
            current: { width: 3001, height: 100 },
            editorPaneWidth: 1000, // 1000 * (3001/3000) = 1000.333 → rounds to 1000
            previewAreaHeight: 50,
            debugPaneLatchHeight: 50,
            isDebugPaneMinimized: false
        });
        expect(result.editorPaneViewport.width).toBe(1000);
        expect(result.previewAreaViewport.width).toBe(2001);
        expect(
            result.editorPaneViewport.width +
                result.previewAreaViewport.width
        ).toBe(3001);
    });

    it('debug pane absorbs rounding error so height axis still sums exactly', () => {
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 3 },
            current: { width: 1500, height: 10 },
            editorPaneWidth: 600,
            previewAreaHeight: 1, // 1 * (10/3) = 3.333 → rounds to 3
            debugPaneLatchHeight: 1,
            isDebugPaneMinimized: false
        });
        expect(result.previewAreaViewport.height).toBe(3);
        expect(result.debugPaneViewport.height).toBe(7);
        expect(
            result.previewAreaViewport.height +
                result.debugPaneViewport.height
        ).toBe(10);
    });

    it('clamps right pane to DEBUG_PANE_CONFIGURATION.minWidth when proportional scale would go below', () => {
        // Container shrinks from 1500 to 800. Proportional split of a 60/40
        // (right/editor) ratio yields right=480 — below minWidth=525.
        // Allotment will render right at 525, so the store must agree;
        // otherwise the same store-vs-render desync the rescale exists to
        // prevent reappears at a smaller scale.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 800, height: 800 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        expect(result.previewAreaViewport.width).toBe(MIN_RIGHT_WIDTH);
        expect(result.debugPaneViewport.width).toBe(MIN_RIGHT_WIDTH);
        expect(result.editorPaneViewport.width).toBe(800 - MIN_RIGHT_WIDTH);
        expect(
            result.editorPaneViewport.width +
                result.previewAreaViewport.width
        ).toBe(800);
    });

    it('preserves debug height at toolbarMinSize exactly when minimized', () => {
        // Critical invariant: the toggle-expand effect checks
        // `debugPaneViewport.height === toolbarMinSize` (strict equality)
        // to decide whether to fire the programmatic expand. Deriving the
        // debug height from a proportionally-scaled preview height drifts
        // (doubling the container produces 2 * toolbarMinSize, not
        // toolbarMinSize) and silently breaks user-driven expand for the
        // rest of the session.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 800 },
            current: { width: 1500, height: 1600 },
            editorPaneWidth: 600,
            previewAreaHeight: 770, // minimized layout: most space to preview
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: true
        });
        expect(result.debugPaneViewport.height).toBe(
            DEBUG_PANE_CONFIGURATION.toolbarMinSize
        );
        expect(result.previewAreaViewport.height).toBe(
            1600 - DEBUG_PANE_CONFIGURATION.toolbarMinSize
        );
        // Latch is scaled so the restore target tracks the new container.
        // `getDebugPaneLatchHeight` passes the latch through verbatim when
        // minimized, so the scaled value reaches the output.
        expect(result.debugPaneLatchHeight).toBe(640);
    });

    it('falls back to scale=1 on non-positive prev dimensions instead of producing NaN', () => {
        // The pure helper is exported for testing. The production caller
        // already guards against this via the `!prev` check and the
        // hydration-time seed. For unexpected callers (tests, future bugs
        // in the seeding path), emit a warning and fall back to scale=1
        // rather than producing NaN / Infinity outputs. The rest of the
        // function (minSize clamp, latch routing) still applies.
        const result = scalePaneSizesForContainerResize({
            prev: { width: 0, height: 0 },
            current: { width: 1500, height: 800 },
            editorPaneWidth: 600,
            previewAreaHeight: 480,
            debugPaneLatchHeight: 320,
            isDebugPaneMinimized: false
        });
        // scale=1 ⇒ inputs pass through; preview height absorbs the rest
        // of the container height; minSize clamp not engaged here.
        expect(result.editorPaneViewport.width).toBe(600);
        expect(result.previewAreaViewport.width).toBe(900);
        expect(result.previewAreaViewport.height).toBe(480);
        expect(result.debugPaneViewport.height).toBe(320);
        // No NaN / Infinity in any output value.
        Object.values(result.editorPaneViewport).forEach((v) => {
            expect(Number.isFinite(v)).toBe(true);
        });
        Object.values(result.previewAreaViewport).forEach((v) => {
            expect(Number.isFinite(v)).toBe(true);
        });
        Object.values(result.debugPaneViewport).forEach((v) => {
            expect(Number.isFinite(v)).toBe(true);
        });
        expect(Number.isFinite(result.debugPaneLatchHeight)).toBe(true);
    });

    it('falls back to default percentage latch when scaled debug height is below areaMinSize', () => {
        // Container shrinks dramatically (height 1000 → 200). Scaled debug
        // height (30) is below areaMinSize (100), so the latch falls back
        // to `floor(contentHeight * preferredHeightPercentage)` =
        // floor(200 * 0.4) = 80. Without routing through
        // getDebugPaneLatchHeight, the latch would naively scale to ~30
        // (uselessly small on restore).
        const result = scalePaneSizesForContainerResize({
            prev: { width: 1500, height: 1000 },
            current: { width: 1500, height: 200 },
            editorPaneWidth: 600,
            previewAreaHeight: 850,
            debugPaneLatchHeight: 150,
            isDebugPaneMinimized: false
        });
        expect(result.debugPaneLatchHeight).toBe(80);
    });
});
