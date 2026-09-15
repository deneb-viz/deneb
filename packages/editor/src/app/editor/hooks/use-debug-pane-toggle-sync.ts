import { useLayoutEffect } from 'react';
import { usePrevious } from '@uidotdev/usehooks';

import { logDebug } from '@deneb-viz/utils/logging';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import {
    getPreviewDebugPaneResetSizes,
    getPreviewDebugPaneSizes
} from './pane-layout-helpers';

const LOG_PREFIX = 'useEditorPaneLayout';

type UseDebugPaneToggleSyncParams = {
    containerWidth: number | undefined;
    containerHeight: number | undefined;
    hasHydratedViewports: boolean;
    isDebugPaneMinimized: boolean;
    debugPaneViewportHeight: number;
    debugPaneLatchHeight: number | null;
    resizeVertical: (sizes: number[]) => void;
};

/**
 * Handle toggle events for the debug pane (minimize/expand), which need a
 * programmatic resize of the vertical pane. Calls `usePrevious` internally
 * to derive the previous value of `isDebugPaneMinimized`; the effect only
 * fires when the value transitions (and not on the initial mount, where
 * `usePrevious` returns `null`).
 */
export const useDebugPaneToggleSync = ({
    containerWidth,
    containerHeight,
    hasHydratedViewports,
    isDebugPaneMinimized,
    debugPaneViewportHeight,
    debugPaneLatchHeight,
    resizeVertical
}: UseDebugPaneToggleSyncParams) => {
    const isDebugPaneMinimizedPrev = usePrevious(isDebugPaneMinimized);

    useLayoutEffect(() => {
        const ch = containerHeight ?? 0;
        const isValid = (containerWidth ?? 0) > 0 && ch > 0;
        if (
            isValid &&
            hasHydratedViewports &&
            isDebugPaneMinimizedPrev !== isDebugPaneMinimized &&
            isDebugPaneMinimizedPrev !== null
        ) {
            if (
                isDebugPaneMinimized &&
                debugPaneViewportHeight >
                    DEBUG_PANE_CONFIGURATION.toolbarMinSize
            ) {
                logDebug(`[${LOG_PREFIX}] Triggered pane minimize`);
                const previewDebugPaneSizesNext = getPreviewDebugPaneSizes(
                    ch,
                    isDebugPaneMinimized
                );
                logDebug(`[${LOG_PREFIX}] Minimizing debug pane...`, {
                    debugPaneLatchHeight,
                    previewDebugPaneSizesNext
                });
                resizeVertical(previewDebugPaneSizesNext);
            }
            if (
                !isDebugPaneMinimized &&
                debugPaneViewportHeight ===
                    DEBUG_PANE_CONFIGURATION.toolbarMinSize
            ) {
                logDebug(`[${LOG_PREFIX}] Triggered pane expansion`);
                const previewDebugPaneSizesNext = getPreviewDebugPaneResetSizes(
                    ch,
                    debugPaneLatchHeight
                );
                logDebug(`[${LOG_PREFIX}] Resizing pane for expansion...`, {
                    debugPaneLatchHeight,
                    previewDebugPaneSizesNext
                });
                resizeVertical(previewDebugPaneSizesNext);
            }
        }
    }, [
        containerWidth,
        containerHeight,
        debugPaneLatchHeight,
        debugPaneViewportHeight,
        hasHydratedViewports,
        isDebugPaneMinimized,
        isDebugPaneMinimizedPrev,
        resizeVertical
    ]);
};
