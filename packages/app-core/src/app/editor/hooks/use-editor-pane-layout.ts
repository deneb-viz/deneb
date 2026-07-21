import {
    createRef,
    type RefObject,
    useCallback,
    useRef,
    useState
} from 'react';
import { shallow } from 'zustand/shallow';
import useResizeObserver from 'use-resize-observer';
import type { AllotmentHandle } from 'allotment';

import { logDebug } from '@deneb-viz/utils/logging';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { useDenebState } from '../../../state';
import { getDebugPaneLatchHeight } from './pane-layout-helpers';
import { usePaneHydration } from './use-pane-hydration';
import { usePostHydrationResizeSync } from './use-post-hydration-resize-sync';
import { useDebugPaneToggleSync } from './use-debug-pane-toggle-sync';

const LOG_PREFIX = 'useEditorPaneLayout';

/**
 * Hook that manages all pane sizing, hydration, and resize logic for the editor layout.
 *
 * Orchestrates three side-effect sub-hooks (called in declaration order so
 * effect execution matches the pre-split sequence):
 *   1. `usePaneHydration` - one-shot initial hydration from container dims.
 *   2. `usePostHydrationResizeSync` - proportional rescale on container resize.
 *   3. `useDebugPaneToggleSync` - programmatic resize on debug-pane toggle.
 */
export const useEditorPaneLayout = () => {
    const {
        debugPaneLatchHeight,
        debugPaneViewport,
        editorPaneViewport,
        isDebugPaneMinimized,
        previewAreaViewport,
        position,
        setIsDebugPaneMinimized,
        setViewports
    } = useDenebState(
        (state) => ({
            debugPaneLatchHeight: state.editor.debugPaneLatchHeight,
            debugPaneViewport: state.editor.debugPaneViewport,
            editorPaneViewport: state.editor.editorPaneViewport,
            isDebugPaneMinimized: state.editor.isDebugPaneMinimized,
            previewAreaViewport: state.editor.previewAreaViewport,
            position: state.editorPreferences.jsonEditorPosition,
            setIsDebugPaneMinimized: state.editor.setIsDebugPaneMinimized,
            setViewports: state.editor.setViewports
        }),
        shallow
    );

    // The allotment used to manage programmatic resizing of the preview area and debug panes
    const paneHandleRefVertical = createRef<AllotmentHandle>();

    // Track container size (used for initial sizing and toggle calculations)
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { width: containerWidth, height: containerHeight } =
        useResizeObserver({
            ref: containerRef as RefObject<HTMLDivElement>
        });

    // Whether we should resize the vertical pane via API after an adjustment
    const [hasHydratedViewports, setHasHydratedViewports] = useState(false);

    // Container size at the moment the store was last synced. Compared against
    // the live observer values to detect post-hydration container resizes (most
    // commonly the host's iframe expansion that follows editor open) and trigger
    // a proportional rescale of the stored pane sizes. Without this, the
    // one-shot hydration below captures a partial-expansion size and Fit
    // computes against stale values for the rest of the session.
    const prevContainerSizeRef = useRef<{
        width: number;
        height: number;
    } | null>(null);

    // Commit vertical sizes to store (single dispatch)
    const commitVerticalSizes = useCallback(
        (sizes: number[]) => {
            const [previewH, debugH] = sizes;
            const ch = containerHeight ?? 0;
            const isMin = debugH === DEBUG_PANE_CONFIGURATION.toolbarMinSize;
            const latchHeightNext = getDebugPaneLatchHeight(
                debugH,
                debugPaneLatchHeight ?? 0,
                ch,
                isDebugPaneMinimized
            );
            logDebug(`[${LOG_PREFIX}] Vertical pane commit`, {
                sizes,
                isMin,
                latchHeightNext
            });
            setViewports({
                editorPaneViewport,
                previewAreaViewport: {
                    width: previewAreaViewport.width,
                    height: previewH
                },
                debugPaneViewport: {
                    width: debugPaneViewport.width,
                    height: debugH
                },
                isDebugPaneMinimized: isMin,
                debugPaneLatchHeight: latchHeightNext
            });
        },
        [
            containerHeight,
            debugPaneLatchHeight,
            isDebugPaneMinimized,
            editorPaneViewport,
            previewAreaViewport.width,
            debugPaneViewport.width,
            setViewports
        ]
    );

    // Commit horizontal sizes to store (single dispatch)
    const commitHorizontalSizes = useCallback(
        (sizes: number[]) => {
            const [editorW, rightW] = sizes;
            logDebug(`[${LOG_PREFIX}] Horizontal pane commit`, {
                sizes
            });
            setViewports({
                editorPaneViewport: {
                    width: editorW,
                    height: editorPaneViewport.height
                },
                previewAreaViewport: {
                    width: rightW,
                    height: previewAreaViewport.height
                },
                debugPaneViewport: {
                    width: rightW,
                    height: debugPaneViewport.height
                },
                isDebugPaneMinimized,
                debugPaneLatchHeight:
                    debugPaneLatchHeight ?? debugPaneViewport.height
            });
        },
        [
            setViewports,
            editorPaneViewport.height,
            previewAreaViewport.height,
            debugPaneViewport.height,
            isDebugPaneMinimized,
            debugPaneLatchHeight
        ]
    );

    // Programmatic vertical resize wrapped in a one-shot suppression "transaction"
    const resizeVertical = useCallback(
        (sizes: number[]) => {
            logDebug(`[${LOG_PREFIX}] resizeVertical(programmatic)`, {
                sizes,
                ref: paneHandleRefVertical.current
            });
            paneHandleRefVertical.current?.resize(sizes);
            // Commit immediately (no drag end will fire)
            commitVerticalSizes(sizes);
        },
        [paneHandleRefVertical, commitVerticalSizes]
    );

    // Handle any size change (including reset) - only update the minimized flag
    const handleVerticalChange = useCallback(
        (sizes: number[]) => {
            const [, debugH] = sizes;
            const isMin = debugH === DEBUG_PANE_CONFIGURATION.toolbarMinSize;
            // Only update if the flag has changed
            if (isMin !== isDebugPaneMinimized) {
                logDebug(`[${LOG_PREFIX}] Vertical pane change detected`, {
                    debugH,
                    isMin,
                    wasMinimized: isDebugPaneMinimized
                });
                setIsDebugPaneMinimized(isMin);
            }
        },
        [isDebugPaneMinimized, setIsDebugPaneMinimized]
    );

    // Sub-hooks: order matters - effect execution sequence (hydration ->
    // resize-sync -> toggle-sync) must match the pre-split file.
    usePaneHydration({
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
    });

    usePostHydrationResizeSync({
        containerWidth,
        containerHeight,
        hasHydratedViewports,
        prevContainerSizeRef,
        editorPaneViewport,
        previewAreaViewport,
        debugPaneLatchHeight,
        isDebugPaneMinimized,
        setViewports
    });

    useDebugPaneToggleSync({
        containerWidth,
        containerHeight,
        hasHydratedViewports,
        isDebugPaneMinimized,
        debugPaneViewportHeight: debugPaneViewport.height,
        debugPaneLatchHeight,
        resizeVertical
    });

    return {
        containerRef,
        containerWidth,
        containerHeight,
        hasHydratedViewports,
        paneHandleRefVertical,
        commitVerticalSizes,
        commitHorizontalSizes,
        handleVerticalChange,
        // Viewport state for layout
        debugPaneViewport,
        editorPaneViewport,
        previewAreaViewport,
        position
    };
};
