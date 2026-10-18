// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// `data-view.ts` transitively pulls in our logging module; stub it so
// the unit test runs without the Power BI runtime.
vi.mock('@deneb-viz/utils/logging', () => ({
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn(),
    logDebug: vi.fn()
}));
vi.mock('powerbi-visuals-api', () => ({}));

import { resolveDatasetUpdateAction } from '../data-view';

/**
 * `resolveDatasetUpdateAction` is the pure decision function behind
 * `Deneb.resolveDataset`. It exists so the per-update branch logic — and
 * in particular the recovery branches for interrupted segmented fetches
 * — is unit-testable without standing up the full visual harness.
 *
 * Two regression cases are locked in here:
 *
 *  - `dataChanged=false + isFetchingAdditional=true` → recovery. A
 *    non-volatile update (viewer↔editor / focus-mode transition) arrived
 *    while we were still flagged as fetching. The host won't honour a
 *    `fetchMoreData` call during the transition; the orchestrator clears
 *    the stuck flag and preserves the previously-loaded dataset.
 *
 *  - `isInitialSegment=true + isFetchingAdditional=true` → recovery.
 *    Power BI sometimes sends a fresh `Create` while the previous fetch
 *    chain hasn't finalised (observed on second editor-open of a
 *    fully-loaded multi-segment dataset). Re-entering `fetch-more` in
 *    this case reliably gets stuck (host accepts the call, never
 *    delivers the Append), so we treat the Create as recovery and
 *    preserve the previously-loaded dataset. Documented trade-off: a
 *    legitimate mid-fetch user filter (rare) would produce the same
 *    signal and be discarded by this guard.
 */
describe('resolveDatasetUpdateAction', () => {
    it('returns fetch-more when data changed and more segments are available (cold-load initial Create)', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: true,
                isFetchingAdditional: false,
                isInitialSegment: true
            })
        ).toEqual({ kind: 'fetch-more' });
    });

    it('returns fetch-more for an Append while still mid-fetch (continuing chain)', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: true,
                isFetchingAdditional: true,
                isInitialSegment: false
            })
        ).toEqual({ kind: 'fetch-more' });
    });

    it('returns finalise/normal when data changed and no more segments are available', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: false,
                isFetchingAdditional: false,
                isInitialSegment: true
            })
        ).toEqual({ kind: 'finalise', reason: 'normal' });
    });

    it('returns finalise/normal on the last Append of a multi-segment fetch', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: false,
                isFetchingAdditional: true,
                isInitialSegment: false
            })
        ).toEqual({ kind: 'finalise', reason: 'normal' });
    });

    it('returns skip when nothing changed and we are not flagged as fetching', () => {
        expect(
            resolveDatasetUpdateAction({
                dataChanged: false,
                canFetchMore: false,
                isFetchingAdditional: false,
                isInitialSegment: false
            })
        ).toEqual({ kind: 'skip' });
    });

    it('returns skip when nothing changed even if more segments are advertised (no active fetch)', () => {
        // Defensive: a `metadata.segment` may persist after the last
        // segment has actually been delivered. If nothing else has
        // changed and we are not flagged as fetching, there is nothing
        // to do.
        expect(
            resolveDatasetUpdateAction({
                dataChanged: false,
                canFetchMore: true,
                isFetchingAdditional: false,
                isInitialSegment: false
            })
        ).toEqual({ kind: 'skip' });
    });

    it('returns finalise/recover-interrupted-fetch when stuck fetching and no data change arrived', () => {
        // The first regression case. A non-volatile update (typically
        // a viewer↔editor transition) interrupted an in-progress
        // segmented fetch. The orchestrator clears the stuck flag and
        // preserves the existing dataset.
        expect(
            resolveDatasetUpdateAction({
                dataChanged: false,
                canFetchMore: true,
                isFetchingAdditional: true,
                isInitialSegment: false
            })
        ).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
    });

    it('returns finalise/recover-interrupted-fetch even when no segment metadata is present', () => {
        // A non-volatile transition can drop `metadata.segment` from
        // the first post-transition update. The state-escape path must
        // not depend on segment presence — if we are flagged as
        // fetching and nothing in the change-detection set has flipped,
        // recovery is correct regardless of whether the host still
        // claims more segments exist.
        expect(
            resolveDatasetUpdateAction({
                dataChanged: false,
                canFetchMore: false,
                isFetchingAdditional: true,
                isInitialSegment: false
            })
        ).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
    });

    it('returns finalise/recover-interrupted-fetch when host sends Create while still flagged as fetching (host-restart guard)', () => {
        // The second regression case. Power BI sometimes restarts the
        // segmented chain (sends a fresh Create) while a previous chain
        // is still in progress — observed on second editor-open of a
        // fully-loaded multi-segment dataset. Re-entering fetch-more
        // gets reliably stuck (host accepts, never delivers Append).
        // The guard routes this to recovery so the previously-loaded
        // dataset is preserved and the visual doesn't sit on
        // FetchingMessage forever.
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: true,
                isFetchingAdditional: true,
                isInitialSegment: true
            })
        ).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
    });

    it('host-restart guard fires even when no segment metadata is on the restart Create', () => {
        // Same as above but the restart Create doesn't advertise more
        // segments. The guard still applies — being flagged as fetching
        // while a Create arrives is the signal, regardless of segment
        // metadata.
        expect(
            resolveDatasetUpdateAction({
                dataChanged: true,
                canFetchMore: false,
                isFetchingAdditional: true,
                isInitialSegment: true
            })
        ).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
    });
});
