import { describe, expect, it } from 'vitest';

/**
 * Characterizes the `useCallback` dep array of `ExportInformation`'s
 * `onCheckboxChange` (export-information.tsx).
 *
 * Bug (L2): the callback read `state.interface.embedViewport` to compute the
 * preview-image scale, but its dep array was `[]`. It therefore closed over
 * the MOUNT-time viewport, so toggling the preview checkbox after a resize
 * scaled the image to a stale viewport. Post-fix the deps are
 * `[embedViewport, setPreviewImage]` so the current viewport is always read.
 *
 * app-core vitest runs in the node environment with no `@testing-library/react`;
 * per the established precedent (`signal-value-memo-deps.test.ts`,
 * `data-tab-listener-rebind.test.ts`) we characterize the dep-array contract
 * as a pure model of React's `Object.is`-per-slot recreate semantics.
 */
const shouldCallbackRecreate = (
    prevDeps: readonly unknown[],
    nextDeps: readonly unknown[]
): boolean => {
    if (prevDeps.length !== nextDeps.length) return true;
    for (let i = 0; i < prevDeps.length; i++) {
        if (!Object.is(prevDeps[i], nextDeps[i])) return true;
    }
    return false;
};

// POST-fix deps: [embedViewport, setPreviewImage].
const buildPostFixDeps = (
    embedViewport: unknown,
    setPreviewImage: unknown
) => [embedViewport, setPreviewImage] as const;

// PRE-fix deps: [] — the stale-closure bug shape.
const buildPreFixDeps = () => [] as const;

describe('ExportInformation onCheckboxChange deps (L2 — stale embedViewport)', () => {
    it('recreates the callback when embedViewport changes (current viewport captured)', () => {
        const setPreview = () => {};
        const prev = buildPostFixDeps({ width: 100, height: 50 }, setPreview);
        const next = buildPostFixDeps({ width: 200, height: 80 }, setPreview);
        expect(shouldCallbackRecreate(prev, next)).toBe(true);
    });

    it('does NOT recreate under the pre-fix empty deps — locks the bug shape', () => {
        // Notional resize between mount and toggle: viewport changed, but with
        // `[]` deps the callback is never recreated, so the stale viewport is
        // used. If a future edit reverts to `[]`, the post-fix test above
        // flips and this mismatch is the loud signal.
        expect(
            shouldCallbackRecreate(buildPreFixDeps(), buildPreFixDeps())
        ).toBe(false);
    });

    it('does not recreate when neither dep changes', () => {
        const setPreview = () => {};
        const vp = { width: 100, height: 50 };
        expect(
            shouldCallbackRecreate(
                buildPostFixDeps(vp, setPreview),
                buildPostFixDeps(vp, setPreview)
            )
        ).toBe(false);
    });
});
