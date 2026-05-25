import { type MutableRefObject, useLayoutEffect } from 'react';

import { logDebug } from '@deneb-viz/utils/logging';
import { scalePaneSizesForContainerResize } from './pane-layout-helpers';

const LOG_PREFIX = 'useEditorPaneLayout';

type Viewport = { width: number; height: number };

type SetViewportsArgs = {
    editorPaneViewport: Viewport;
    previewAreaViewport: Viewport;
    debugPaneViewport: Viewport;
    isDebugPaneMinimized: boolean;
    debugPaneLatchHeight: number;
};

type UsePostHydrationResizeSyncParams = {
    containerWidth: number | undefined;
    containerHeight: number | undefined;
    hasHydratedViewports: boolean;
    prevContainerSizeRef: MutableRefObject<{ width: number; height: number } | null>;
    editorPaneViewport: Viewport;
    previewAreaViewport: Viewport;
    debugPaneLatchHeight: number | null | undefined;
    isDebugPaneMinimized: boolean;
    setViewports: (args: SetViewportsArgs) => void;
};

/**
 * Post-hydration container-resize sync. If the container resizes after the
 * one-shot hydration (most commonly the host's iframe expansion settling, or
 * a window resize mid-session), proportionally rescale the stored pane sizes
 * so the store tracks the live container. Allotment auto-rescales its
 * rendered children on container resize but does not fire onChange/onDragEnd,
 * so without this sync the store stays at whatever (possibly mid-expansion
 * partial) sizes the initial hydration captured. Consumers that read pane
 * sizes from the store (notably `getZoomToFitScale`) would otherwise compute
 * against stale values.
 */
export const usePostHydrationResizeSync = ({
    containerWidth,
    containerHeight,
    hasHydratedViewports,
    prevContainerSizeRef,
    editorPaneViewport,
    previewAreaViewport,
    debugPaneLatchHeight,
    isDebugPaneMinimized,
    setViewports
}: UsePostHydrationResizeSyncParams) => {
    useLayoutEffect(() => {
        if (!hasHydratedViewports) return;
        const cw = containerWidth ?? 0;
        const ch = containerHeight ?? 0;
        if (cw <= 0 || ch <= 0) return;
        const prev = prevContainerSizeRef.current;
        if (!prev) return;
        if (prev.width === cw && prev.height === ch) return;

        const next = scalePaneSizesForContainerResize({
            prev,
            current: { width: cw, height: ch },
            editorPaneWidth: editorPaneViewport.width,
            previewAreaHeight: previewAreaViewport.height,
            debugPaneLatchHeight: debugPaneLatchHeight ?? 0,
            isDebugPaneMinimized
        });

        prevContainerSizeRef.current = { width: cw, height: ch };

        logDebug(`[${LOG_PREFIX}] Container resized post-hydration; rescaling`, {
            prev,
            current: { width: cw, height: ch },
            next
        });

        setViewports({
            editorPaneViewport: next.editorPaneViewport,
            previewAreaViewport: next.previewAreaViewport,
            debugPaneViewport: next.debugPaneViewport,
            isDebugPaneMinimized,
            debugPaneLatchHeight: next.debugPaneLatchHeight
        });
    }, [
        containerWidth,
        containerHeight,
        debugPaneLatchHeight,
        editorPaneViewport.width,
        hasHydratedViewports,
        isDebugPaneMinimized,
        previewAreaViewport.height,
        setViewports
    ]);
};
