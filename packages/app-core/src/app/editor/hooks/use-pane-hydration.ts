import { type MutableRefObject, useLayoutEffect } from 'react';

import { logDebug } from '@deneb-viz/utils/logging';
import {
    getDebugPaneLatchHeight,
    getDefaultHorizontalPaneWidth,
    getDefaultVerticalPaneWidth,
    getPreviewDebugPaneSizes
} from './pane-layout-helpers';

const LOG_PREFIX = 'useEditorPaneLayout';

type Viewport = { width: number; height: number };

type SetViewportsArgs = {
    editorPaneViewport: Viewport;
    previewAreaViewport: Viewport;
    debugPaneViewport: Viewport;
    isDebugPaneMinimized: boolean;
    debugPaneLatchHeight: number;
};

type UsePaneHydrationParams = {
    containerWidth: number | undefined;
    containerHeight: number | undefined;
    hasHydratedViewports: boolean;
    setHasHydratedViewports: (next: boolean | ((prev: boolean) => boolean)) => void;
    prevContainerSizeRef: MutableRefObject<{ width: number; height: number } | null>;
    editorPaneViewport: Viewport;
    previewAreaViewport: Viewport;
    debugPaneViewport: Viewport;
    debugPaneLatchHeight: number | null | undefined;
    isDebugPaneMinimized: boolean;
    setViewports: (args: SetViewportsArgs) => void;
};

/**
 * One-shot initial hydration of the editor pane sizes from the live container
 * dimensions. Runs when the container first reports positive dimensions and
 * `hasHydratedViewports === false`.
 */
export const usePaneHydration = ({
    containerWidth,
    containerHeight,
    hasHydratedViewports,
    setHasHydratedViewports,
    prevContainerSizeRef,
    editorPaneViewport,
    previewAreaViewport,
    debugPaneViewport,
    debugPaneLatchHeight,
    isDebugPaneMinimized,
    setViewports
}: UsePaneHydrationParams) => {
    useLayoutEffect(() => {
        const cw = containerWidth ?? 0;
        const ch = containerHeight ?? 0;
        const isValid = cw > 0 && ch > 0;
        if (isValid && !hasHydratedViewports) {
            const vHeights = getPreviewDebugPaneSizes(ch, isDebugPaneMinimized);
            const hw =
                editorPaneViewport.width || getDefaultHorizontalPaneWidth(cw);
            const vw =
                previewAreaViewport.width || getDefaultVerticalPaneWidth(cw);
            const editorPaneViewportNext = {
                height: editorPaneViewport.height || ch,
                width: hw
            };
            const previewAreaViewportNext = {
                height: previewAreaViewport.height || vHeights[0],
                width: vw
            };
            const debugPaneViewportNext = {
                height: debugPaneViewport.height || vHeights[1],
                width: debugPaneViewport.width || vw
            };
            const latchHeightNext = getDebugPaneLatchHeight(
                debugPaneViewportNext.height,
                debugPaneLatchHeight ?? 0,
                ch,
                isDebugPaneMinimized
            );
            logDebug(`[${LOG_PREFIX}] Hydrating viewports...`, {
                container: { width: cw, height: ch },
                editorPaneViewport: editorPaneViewportNext,
                previewAreaViewport: previewAreaViewportNext,
                debugPaneViewport: debugPaneViewportNext,
                isDebugPaneMinimized,
                latchHeightNext
            });
            setHasHydratedViewports(() => true);
            prevContainerSizeRef.current = { width: cw, height: ch };
            setViewports({
                editorPaneViewport: editorPaneViewportNext,
                previewAreaViewport: previewAreaViewportNext,
                debugPaneViewport: debugPaneViewportNext,
                isDebugPaneMinimized,
                debugPaneLatchHeight: latchHeightNext
            });
        }
    }, [
        containerWidth,
        containerHeight,
        debugPaneLatchHeight,
        debugPaneViewport.height,
        debugPaneViewport.width,
        editorPaneViewport.height,
        editorPaneViewport.width,
        hasHydratedViewports,
        isDebugPaneMinimized,
        previewAreaViewport.height,
        previewAreaViewport.width,
        setViewports
    ]);
};
