// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// `powerbi-visuals-api` const enums have no runtime representation in
// the test environment (the package's runtime export is only
// `{ version, schemas }`), but `display-mode.ts`'s update-type helpers
// read `powerbi.VisualUpdateType.*` at runtime. Provide the pinned
// numeric values (they are `satisfies`-guarded in
// src/__test__/harness/fixtures.ts, so API drift fails compilation).
vi.mock('powerbi-visuals-api', () => ({
    default: {
        VisualUpdateType: {
            Data: 2,
            Resize: 4,
            ViewMode: 8,
            Style: 16,
            ResizeEnd: 32
        }
    }
}));

import type powerbi from 'powerbi-visuals-api';

import {
    doesModeAllowEmbedViewportSet,
    getUpdatedDisplayHistoryList,
    type DisplayHistoryRecord,
    type GetUpdatedHistoryListPayload
} from '../../lib/state/display-mode';
import {
    buildCategorical,
    buildDataView,
    buildUpdateOptions,
    buildViewportBeforeIframeResizeQuirk,
    EDIT_MODE_ADVANCED,
    EDIT_MODE_DEFAULT,
    EDITOR_VIEWPORT,
    FRACTIONAL_VIEWPORT,
    UPDATE_TYPE_DATA,
    UPDATE_TYPE_RESIZE,
    UPDATE_TYPE_RESIZE_WITH_END
} from './fixtures';

/**
 * Fake-host display-mode scenarios: drives the REAL
 * `getUpdatedDisplayHistoryList` / `doesModeAllowEmbedViewportSet`
 * against the documented host quirks:
 *
 *  - fractional viewport dimensions (Desktop, snap-to-grid off);
 *  - `isInFocus: undefined` on the options envelope;
 *  - host reports the new viewport before the iframe physically
 *    resizes (freeze/bounce docs) — the embed-viewport commit gate
 *    must block the premature value;
 *  - segmented-fetch quirk #2 — a transition arriving mid-fetch keeps
 *    the resolved mode pinned at `fetching`, which must remain
 *    commit-unsafe.
 */

const buildSettingsStub = (): GetUpdatedHistoryListPayload['settings'] =>
    ({
        vega: {
            output: { jsonSpec: { value: '{"mark": "bar"}' } }
        }
    }) as unknown as GetUpdatedHistoryListPayload['settings'];

const pushHistory = (
    history: DisplayHistoryRecord[],
    options: powerbi.extensibility.visual.VisualUpdateOptions,
    isFetchingAdditionalData = false
): DisplayHistoryRecord[] =>
    getUpdatedDisplayHistoryList(history, {
        options,
        settings: buildSettingsStub(),
        isFetchingAdditionalData
    });

const viewerBaseline = () =>
    pushHistory(
        [],
        buildUpdateOptions({
            dataView: buildDataView({ categorical: buildCategorical(100) }),
            type: UPDATE_TYPE_DATA,
            editMode: EDIT_MODE_DEFAULT,
            viewport: FRACTIONAL_VIEWPORT
        })
    );

describe('display-mode quirks: fractional viewports (Desktop snap-to-grid off)', () => {
    it('viewer→editor transition sequence resolves correctly with sub-pixel viewports throughout', () => {
        // [initial] viewer at a fractional viewport.
        let history = viewerBaseline();
        expect(history[0].displayMode).toBe('viewer');
        expect(history[0].viewport).toBe(FRACTIONAL_VIEWPORT);

        // #1 — editMode Advanced, Resize+ResizeEnd, premature editor
        // viewport (also fractional) → transition start.
        history = pushHistory(
            history,
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(100)
                }),
                type: UPDATE_TYPE_RESIZE_WITH_END,
                editMode: EDIT_MODE_ADVANCED,
                viewport: EDITOR_VIEWPORT
            })
        );
        expect(history[0].displayMode).toBe('transition-viewer-editor');

        // #2 — editMode Advanced, Resize only → transition confirmed.
        history = pushHistory(
            history,
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(100)
                }),
                type: UPDATE_TYPE_RESIZE,
                editMode: EDIT_MODE_ADVANCED,
                viewport: EDITOR_VIEWPORT
            })
        );
        expect(history[0].displayMode).toBe('editor');
    });
});

describe('display-mode quirks: isInFocus arrives as undefined', () => {
    it('mode resolution tolerates the undefined flag and the history record preserves it verbatim', () => {
        const options = buildUpdateOptions({
            dataView: buildDataView({ categorical: buildCategorical(100) }),
            type: UPDATE_TYPE_DATA,
            editMode: EDIT_MODE_DEFAULT
        });
        expect((options as { isInFocus?: boolean }).isInFocus).toBeUndefined();
        const history = pushHistory([], options);
        expect(history[0].displayMode).toBe('viewer');
        expect(history[0].isInFocus).toBeUndefined();
    });
});

describe('display-mode quirks: host reports the new viewport before the iframe resizes', () => {
    it('the transition mode resolved for the premature-viewport update is commit-unsafe, so the wrong dimensions never reach embedViewport', () => {
        const quirk = buildViewportBeforeIframeResizeQuirk();
        // The bounce doc's precision pitfall: the host-reported width is
        // fractional while the iframe's innerWidth is an integer —
        // strict equality between them can never confirm settlement.
        expect(quirk.options.viewport.width).not.toBe(quirk.physicalInnerWidth);

        const history = pushHistory(viewerBaseline(), quirk.options);
        expect(history[0].displayMode).toBe('transition-viewer-editor');
        expect(history[0].viewport).toBe(EDITOR_VIEWPORT);
        // The commit gate blocks the premature host viewport.
        expect(doesModeAllowEmbedViewportSet(history[0].displayMode)).toBe(
            false
        );
    });
});

describe('display-mode quirks: transition arriving mid-fetch (segmented-fetch quirk #2)', () => {
    it('the stuck fetching flag pins the resolved mode at fetching, which stays commit-unsafe', () => {
        // Mid-fetch: a segment update lands while the fetching flag is
        // set, so the latest history record resolves to `fetching`
        // (not `viewer`) — this is what masks the transition detector.
        const midFetch = pushHistory(
            viewerBaseline(),
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(100),
                    segment: true
                }),
                type: UPDATE_TYPE_DATA,
                editMode: EDIT_MODE_DEFAULT
            }),
            true
        );
        expect(midFetch[0].displayMode).toBe('fetching');
        // A transition-shaped update (editor viewport, Advanced edit
        // mode) arrives while `isFetchingAdditional` is still true —
        // the resolved mode stays pinned at `fetching` because the
        // transition detector requires the prior record to be `viewer`.
        const history = pushHistory(
            midFetch,
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(100)
                }),
                type: UPDATE_TYPE_RESIZE_WITH_END,
                editMode: EDIT_MODE_ADVANCED,
                viewport: EDITOR_VIEWPORT
            }),
            true
        );
        expect(history[0].displayMode).toBe('fetching');
        // Quirk #2's fix: `fetching` is excluded from the embed-
        // viewport commit gate, so the editor-sized viewport reported
        // during the masked transition cannot pollute embedViewport.
        expect(doesModeAllowEmbedViewportSet('fetching')).toBe(false);
    });
});
