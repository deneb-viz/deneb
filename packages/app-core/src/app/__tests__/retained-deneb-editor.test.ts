import { describe, expect, it } from 'vitest';

import { computeRetentionState } from '../retained-deneb-editor-state';
import { computeGateMatch } from '../viewport-match-gate-state';

/**
 * Tests for the pure retention-state helper that drives
 * `<RetainedDenebEditor>`.
 *
 * The helper answers two questions per render:
 *   - shouldRender: should the editor subtree be in the DOM at all?
 *   - isVisible:    should it be `display: flex` or `display: none`?
 *
 * The latch is sticky in the calling component: once `hasOpenedOnce`
 * flips to true on the first editor mode it stays true for the
 * lifetime of the visual instance. The editor never unmounts after
 * the first open, so subsequent viewer↔editor toggles are a CSS
 * visibility flip, not a remount.
 */

describe('computeRetentionState', () => {
    it('does not render anything before the first editor open', () => {
        expect(computeRetentionState(false, false)).toEqual({
            shouldRender: false,
            isVisible: false
        });
    });

    it('renders and shows the editor on first open', () => {
        expect(computeRetentionState(false, true)).toEqual({
            shouldRender: true,
            isVisible: true
        });
    });

    it('keeps the editor mounted but hidden when the user goes back to viewer after opening', () => {
        expect(computeRetentionState(true, false)).toEqual({
            shouldRender: true,
            isVisible: false
        });
    });

    it('shows the retained editor when the user reopens it', () => {
        expect(computeRetentionState(true, true)).toEqual({
            shouldRender: true,
            isVisible: true
        });
    });
});

/**
 * Tests for the gate-match predicate that decides when the
 * viewport-match gate inside `<RetainedDenebEditor>` should release.
 *
 * These tests exercise the freeze-on-transition fix's load-bearing
 * invariants:
 *   - Width-only equality (height has a persistent ~36px chrome offset)
 *   - Latest-vs-start comparison so a host viewport flap does not
 *     falsely release the gate
 *   - Stale-snapshot bypass when the host had already reported the
 *     post-transition viewport before the gate engaged
 */
describe('computeGateMatch', () => {
    const baseInput = {
        startWidth: 800 as number | undefined,
        currentWidth: 1200 as number | undefined,
        iframeInnerWidth: 1200,
        elapsedMs: 10,
        bypassMs: 150
    };

    it('does not release when the host viewport width is undefined', () => {
        // Power BI has not yet sent the first `update()` viewport.
        // The gate must wait — iframe width could be anything.
        expect(
            computeGateMatch({ ...baseInput, currentWidth: undefined })
        ).toBe(false);
    });

    it('does not release when the iframe interior is at the wrong size', () => {
        // Host has reported the new viewport (1200) but the iframe
        // is still at the pre-expansion size (800). The original
        // freeze symptom — releasing the gate here would mount the
        // editor at the compressed size.
        expect(computeGateMatch({ ...baseInput, iframeInnerWidth: 800 })).toBe(
            false
        );
    });

    it('releases when the iframe matches a viewport that has changed since engage', () => {
        // The standard happy path — host paced through a transition
        // and the iframe has caught up.
        expect(computeGateMatch(baseInput)).toBe(true);
    });

    it('matches when the host reports sub-pixel precision but the iframe is at the rounded width', () => {
        // Power BI can report fractional viewport dimensions when
        // snap-to-grid is off in the report (e.g. 286.4729). Without
        // rounding, strict equality with `window.innerWidth` (which
        // is integer per DOM spec) never holds and the gate hangs
        // until the safety timer fires. The predicate normalizes both
        // sides before comparison.
        expect(
            computeGateMatch({
                startWidth: 800,
                currentWidth: 286.4729,
                iframeInnerWidth: 286,
                elapsedMs: 50,
                bypassMs: 150
            })
        ).toBe(true);
    });

    it('does not match when the rounded widths differ by more than half a pixel', () => {
        // A 286.6 host viewport rounds to 287; an iframe at 286 does
        // not match. Documents the rounding boundary so a regression
        // that swaps `Math.round` for `Math.floor` is caught.
        expect(
            computeGateMatch({
                startWidth: 800,
                currentWidth: 286.6,
                iframeInnerWidth: 286,
                elapsedMs: 50,
                bypassMs: 150
            })
        ).toBe(false);
    });

    it('does not release when the latest viewport equals the engage snapshot and the iframe is at that same width', () => {
        // Flap protection. Host oscillates 800 → 805 → 800. When the
        // latest reading lands back on 800 with the iframe also at
        // 800 (pre-expansion), the predicate must NOT release —
        // otherwise the editor mounts at the wrong size and the
        // freeze symptom returns silently.
        expect(
            computeGateMatch({
                ...baseInput,
                startWidth: 800,
                currentWidth: 800,
                iframeInnerWidth: 800,
                elapsedMs: 50
            })
        ).toBe(false);
    });

    it('releases via the stale-match bypass when current matches start past the bypass window', () => {
        // Host had already reported the post-transition viewport
        // before the gate engaged (so startWidth = currentWidth =
        // post-transition value). The change-from-start guard can
        // never fire, but after `bypassMs` the time-based path
        // accepts a width match alone.
        expect(
            computeGateMatch({
                startWidth: 1200,
                currentWidth: 1200,
                iframeInnerWidth: 1200,
                elapsedMs: 200,
                bypassMs: 150
            })
        ).toBe(true);
    });

    it('does not release within the stale-match bypass window when current equals start', () => {
        // Same as above but inside the bypass window — wait it out.
        expect(
            computeGateMatch({
                startWidth: 1200,
                currentWidth: 1200,
                iframeInnerWidth: 1200,
                elapsedMs: 100,
                bypassMs: 150
            })
        ).toBe(false);
    });

    it('treats the bypass threshold as strict greater-than', () => {
        // At exactly bypassMs the gate stays closed; one tick later
        // it releases. Documents the boundary so a future refactor
        // does not flip the inequality.
        expect(
            computeGateMatch({
                startWidth: 1200,
                currentWidth: 1200,
                iframeInnerWidth: 1200,
                elapsedMs: 150,
                bypassMs: 150
            })
        ).toBe(false);
        expect(
            computeGateMatch({
                startWidth: 1200,
                currentWidth: 1200,
                iframeInnerWidth: 1200,
                elapsedMs: 151,
                bypassMs: 150
            })
        ).toBe(true);
    });

    it('releases on undefined start when current is defined and the iframe matches', () => {
        // First-ever open: visual has not received a host update at
        // gate-engage time, so startWidth is undefined. As soon as
        // the host reports any viewport AND the iframe matches it,
        // the change-from-undefined branch fires.
        expect(
            computeGateMatch({
                startWidth: undefined,
                currentWidth: 1200,
                iframeInnerWidth: 1200,
                elapsedMs: 10,
                bypassMs: 150
            })
        ).toBe(true);
    });
});
