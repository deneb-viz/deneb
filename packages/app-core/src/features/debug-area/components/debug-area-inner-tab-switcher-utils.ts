import type { DataPivotTab } from '../../../state/debug';
import type { DebugPaneRole } from '../../../lib';

/**
 * Pure helper for the Debug Area's outer-to-inner routing decision.
 *
 * Given the active outer pivot, returns whether the nested inner `data`
 * toolbar should be rendered. The inner toolbar is only relevant when the
 * outer pivot is `'data'` — rendering it on `'log'` or `'signal'` would
 * leak controls that have no effect.
 *
 * Extracted as a pure helper so the routing logic is testable without
 * rendering React (vitest runs in node env in this workspace; see the
 * unit plan's testing constraint).
 */
export const shouldRenderInnerToolbar = (outerPivot: DebugPaneRole): boolean =>
    outerPivot === 'data';

/**
 * Content key for the `InnerDataArea` rendering decision. The key is a
 * stable string identifier rather than the component itself so the
 * routing can be unit-tested in a node environment.
 */
export type InnerDataAreaContentKey = 'source' | 'data';

/**
 * Pure helper mapping the inner-tab slice value to a content key. Mirrors
 * the `DataPivotTab` shape 1:1 today; exists as a named indirection so
 * later units can evolve the routing (e.g. loading/error intermediate
 * states) without a call-site refactor.
 */
export const resolveInnerTabContent = (
    dataPivot: DataPivotTab
): InnerDataAreaContentKey => {
    switch (dataPivot) {
        case 'source':
            return 'source';
        case 'data':
            return 'data';
    }
};
