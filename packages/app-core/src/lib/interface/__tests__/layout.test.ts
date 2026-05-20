import { describe, expect, it } from 'vitest';

import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { computeZoomToFitScale } from '../layout';

/**
 * Pure-helper tests for the zoom-to-fit computation that backs the editor's
 * "Fit" zoom level. The function reads from store state in production via
 * `getZoomToFitScale()`; this characterises the pure inner computation
 * (`computeZoomToFitScale`) which takes the same inputs as parameters so
 * the math is testable without mocking Zustand.
 *
 * Bug being guarded against: when `previewAreaViewport` is the unhydrated
 * default `{width: 0, height: 0}` (e.g. the editor was just opened and the
 * layout `useLayoutEffect` has not yet committed measured viewports), the
 * unguarded math produced negative scale factors. The popover entry path
 * silently clamped those to the configured min (10%), and the hotkey entry
 * path (`handleZoomFit` in `lib/commands/actions.ts`) wrote them through
 * verbatim — both surfaced as "Fit shrinks the visual to a smaller value
 * than currently displayed rather than fitting".
 */

const MIN = VISUAL_PREVIEW_ZOOM_CONFIGURATION.min;
const MAX = VISUAL_PREVIEW_ZOOM_CONFIGURATION.max;
const DEFAULT_ZOOM = VISUAL_PREVIEW_ZOOM_CONFIGURATION.default;

describe('computeZoomToFitScale', () => {
    describe('input guards (the unhydrated/missing-viewport bug)', () => {
        it('returns the default zoom when previewAreaViewport is the unhydrated {0, 0} initial state', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 0, height: 0 },
                    embedViewport: { width: 600, height: 400 }
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when previewAreaViewport.width is 0', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 0, height: 500 },
                    embedViewport: { width: 600, height: 400 }
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when previewAreaViewport.height is 0', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 1000, height: 0 },
                    embedViewport: { width: 600, height: 400 }
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when embedViewport is null (visual not yet rendered)', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 1000, height: 500 },
                    embedViewport: null
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when embedViewport.width is 0', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 1000, height: 500 },
                    embedViewport: { width: 0, height: 400 }
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when embedViewport.height is 0', () => {
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 1000, height: 500 },
                    embedViewport: { width: 600, height: 0 }
                })
            ).toBe(DEFAULT_ZOOM);
        });

        it('returns the default zoom when previewAreaViewport.width is negative (guard covers <= 0, not just == 0)', () => {
            // Locks the `<= 0` guard against a future refactor that
            // narrows to `=== 0` — negative dimensions should still fall
            // through to the safe default, not bypass the guard.
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: -1, height: 500 },
                    embedViewport: { width: 600, height: 400 }
                })
            ).toBe(DEFAULT_ZOOM);
        });
    });

    describe('output clamping (never returns out-of-range values)', () => {
        it('clamps to the configured min when the computed scale would land below min', () => {
            // Visual tall, preview short — height is the binding constraint
            // and the math drives scaleFactorHeight below MIN (=10).
            const result = computeZoomToFitScale({
                previewAreaViewport: { width: 1000, height: 50 },
                embedViewport: { width: 600, height: 5000 }
            });
            expect(result).toBe(MIN);
        });

        it('clamps to the configured max when the computed scale would land above max', () => {
            // Visual much smaller than preview — both scale factors exceed
            // MAX (=400) but the clamp pulls them back.
            const result = computeZoomToFitScale({
                previewAreaViewport: { width: 10000, height: 10000 },
                embedViewport: { width: 50, height: 50 }
            });
            expect(result).toBe(MAX);
        });

        it('clamps to MIN for a tiny pane whose padded dimensions go negative', () => {
            // previewAreaViewport=25x25 passes the guard, but
            // getAdjustedPreviewArea*ForPadding subtracts 20/30 and then
            // ZOOM_FIT_BUFFER subtracts another 15, driving the numerator
            // negative for both axes. Both scale factors are negative
            // (-2, -4), willScaledDimensionFit accepts the smaller scale,
            // and the clamp recovers it to MIN. Pinned to MIN rather than
            // a range so a future regression that shifts to zDefault, MAX,
            // or any other in-range value is caught.
            const result = computeZoomToFitScale({
                previewAreaViewport: { width: 25, height: 25 },
                embedViewport: { width: 800, height: 600 }
            });
            expect(result).toBe(MIN);
        });
    });

    describe('happy paths (binding-constraint selection)', () => {
        it('returns the height-derived scale when height is the binding constraint', () => {
            // Visual 800x600, preview 1000x500 — preview is wider than tall
            // relative to the visual, so height limits the fit.
            //   previewHeight (after padding)            = 500 - 6*5     = 470
            //   scaleFactorHeight = floor(100 * (470 - 15) / 600)        = 75
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 1000, height: 500 },
                    embedViewport: { width: 800, height: 600 }
                })
            ).toBe(75);
        });

        it('returns the width-derived scale when width is the binding constraint', () => {
            // Visual 800x200, preview 500x1000 — visual is much wider relative
            // to preview, so width limits the fit.
            //   previewWidth (after padding)             = 500 - 4*5     = 480
            //   scaleFactorWidth = floor(100 * (480 - 15) / 800)         = 58
            expect(
                computeZoomToFitScale({
                    previewAreaViewport: { width: 500, height: 1000 },
                    embedViewport: { width: 800, height: 200 }
                })
            ).toBe(58);
        });
    });
});
