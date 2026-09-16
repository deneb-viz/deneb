import { logDebug, logWarning } from '@deneb-viz/utils/logging';
import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';

const LOG_PREFIX = 'useEditorPaneLayout';

/**
 * Proportionally rescale stored pane sizes to a new container size.
 *
 * Used by the post-hydration sync effect to keep the editor's pane store in
 * sync with the live container when it resizes after the one-shot hydration
 * (host iframe expansion, window resize). Returns new pane sizes such that:
 * - `editorPaneViewport.width + previewAreaViewport.width === current.width`
 *   (preview pane absorbs rounding error)
 * - `previewAreaViewport.height + debugPaneViewport.height === current.height`
 *   (debug pane absorbs rounding error)
 * - User-dragged ratios are preserved: `editorPaneViewport.width /
 *   current.width` and `previewAreaViewport.height / current.height` match
 *   their pre-resize values (modulo rounding and the `minWidth` clamp).
 * - Right (preview + debug) pane width is clamped to
 *   `DEBUG_PANE_CONFIGURATION.minWidth` so the store stays in sync with what
 *   Allotment renders (the right `Allotment.Pane` enforces the same minSize).
 * - Latch height is routed through {@link getDebugPaneLatchHeight} so its
 *   "freeze while minimized" and "fall back to default percentage when
 *   below `areaMinSize`" semantics apply uniformly across the hydrate,
 *   drag, and rescale paths.
 *
 * Exported for unit tests; the hook is the only production caller.
 */
export const scalePaneSizesForContainerResize = ({
    prev,
    current,
    editorPaneWidth,
    previewAreaHeight,
    debugPaneLatchHeight,
    isDebugPaneMinimized
}: {
    prev: { width: number; height: number };
    current: { width: number; height: number };
    editorPaneWidth: number;
    previewAreaHeight: number;
    debugPaneLatchHeight: number;
    isDebugPaneMinimized: boolean;
}) => {
    if (prev.width <= 0 || prev.height <= 0) {
        logWarning(
            `[${LOG_PREFIX}] scalePaneSizesForContainerResize: prev dimensions must be > 0; falling back to scale=1`,
            { prev, current }
        );
    }
    // Fall back to scale=1 on a non-positive `prev`. The production caller
    // already guards via the `!prev` check and the hydration-time seed, so
    // this branch only triggers for direct (test) callers or future bugs in
    // the seeding path - emit the warning above and let the rest of the
    // function produce a no-op rescale (clamps and latch routing still
    // apply) rather than NaN / Infinity outputs.
    const scaleX = prev.width > 0 ? current.width / prev.width : 1;
    const scaleY = prev.height > 0 ? current.height / prev.height : 1;
    const proposedEditorW = Math.round(editorPaneWidth * scaleX);
    const proposedRightW = Math.max(0, current.width - proposedEditorW);
    const newRightW = Math.max(
        proposedRightW,
        DEBUG_PANE_CONFIGURATION.minWidth
    );
    const newEditorW = Math.max(0, current.width - newRightW);
    // When minimized, debug pane height MUST be exactly `toolbarMinSize` -
    // the toggle effect's expand branch checks `=== toolbarMinSize` (strict
    // equality) before firing the programmatic resize. Deriving it from the
    // proportionally-scaled preview height drifts (e.g., doubling container
    // height yields debug = 2 * toolbarMinSize) and silently breaks
    // user-driven expand for the rest of the session.
    const newDebugH = isDebugPaneMinimized
        ? DEBUG_PANE_CONFIGURATION.toolbarMinSize
        : Math.max(0, current.height - Math.round(previewAreaHeight * scaleY));
    const newPreviewH = Math.max(0, current.height - newDebugH);
    const newLatch = getDebugPaneLatchHeight(
        newDebugH,
        Math.round(debugPaneLatchHeight * scaleY),
        current.height,
        isDebugPaneMinimized
    );
    return {
        editorPaneViewport: { width: newEditorW, height: current.height },
        previewAreaViewport: { width: newRightW, height: newPreviewH },
        debugPaneViewport: { width: newRightW, height: newDebugH },
        debugPaneLatchHeight: newLatch
    };
};

export const getDebugPaneLatchHeight = (
    currentItemHeight: number,
    currentLatchHeight: number,
    contentHeight: number,
    isDebugPaneMinimized: boolean
) => {
    if (isDebugPaneMinimized) {
        logDebug(
            `[${LOG_PREFIX}] getDebugPaneLatchHeight - skipping calculation, as pane is minimized`
        );
        return currentLatchHeight;
    }
    const latchHeight =
        currentItemHeight < DEBUG_PANE_CONFIGURATION.areaMinSize
            ? getDefaultDebugPaneHeightForContent(contentHeight)
            : currentItemHeight;
    logDebug(`[${LOG_PREFIX}] getDebugPaneLatchHeight`, {
        currentHeight: currentItemHeight,
        contentHeight,
        latchHeight
    });
    return latchHeight;
};

export const getDefaultDebugPaneHeightForContent = (contentHeight: number) =>
    Math.floor(
        contentHeight * DEBUG_PANE_CONFIGURATION.preferredHeightPercentage
    );

export const getDefaultHorizontalPaneWidth = (contentWidth: number) =>
    Math.floor(contentWidth * SPLIT_PANE_CONFIGURATION.defaultSizePercent);

export const getDefaultPreviewDebugPaneSizes = (contentHeight: number) => [
    getDefaultVerticalPaneHeight(contentHeight),
    getDefaultDebugPaneHeightForContent(contentHeight)
];

export const getDefaultVerticalPaneHeight = (contentHeight: number) =>
    Math.floor(
        contentHeight * (1 - DEBUG_PANE_CONFIGURATION.preferredHeightPercentage)
    );

export const getDefaultVerticalPaneWidth = (contentWidth: number) =>
    Math.floor(
        contentWidth * (1 - SPLIT_PANE_CONFIGURATION.defaultSizePercent)
    );

export const getPreviewDebugPaneResetSizes = (
    contentHeight: number,
    latchHeight: number | null
) => {
    // Fallback if latch height is not yet established or is below minimum
    const effectiveLatch =
        !latchHeight || latchHeight < DEBUG_PANE_CONFIGURATION.toolbarMinSize
            ? getDefaultDebugPaneHeightForContent(contentHeight)
            : latchHeight;
    const previewPaneSizesNext = [
        contentHeight - effectiveLatch,
        Math.max(effectiveLatch, DEBUG_PANE_CONFIGURATION.toolbarMinSize)
    ];
    logDebug(`[${LOG_PREFIX}] getPreviewDebugPaneResetSizes`, {
        contentHeight,
        latchHeight,
        effectiveLatch,
        previewPaneSizesNext
    });
    return previewPaneSizesNext;
};

export const getPreviewDebugPaneSizes = (
    contentHeight: number,
    isDebugPaneMinimized: boolean
) => {
    const previewPaneSizesNext = isDebugPaneMinimized
        ? [
              contentHeight - DEBUG_PANE_CONFIGURATION.toolbarMinSize,
              DEBUG_PANE_CONFIGURATION.toolbarMinSize
          ]
        : getDefaultPreviewDebugPaneSizes(contentHeight);
    logDebug(`[${LOG_PREFIX}] getPreviewDebugPaneSizes`, {
        contentHeight,
        isDebugPaneMinimized,
        previewPaneSizesNext
    });
    return previewPaneSizesNext;
};
