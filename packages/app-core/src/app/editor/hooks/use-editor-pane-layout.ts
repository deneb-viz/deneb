import {
    createRef,
    type RefObject,
    useCallback,
    useLayoutEffect,
    useRef,
    useState
} from 'react';
import { shallow } from 'zustand/shallow';
import { usePrevious } from '@uidotdev/usehooks';
import useResizeObserver from 'use-resize-observer';
import type { AllotmentHandle } from 'allotment';

import { logDebug, logWarning } from '@deneb-viz/utils/logging';
import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';
import { useDenebState } from '../../../state';

const LOG_PREFIX = 'useEditorPaneLayout';

/**
 * Hook that manages all pane sizing, hydration, and resize logic for the editor layout.
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
    const isDebugPaneMinimizedPrev = usePrevious(isDebugPaneMinimized);

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

    // Work out initial dimensions for the panes
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

    // Post-hydration: if the container resizes after the one-shot hydration
    // (most commonly the host's iframe expansion settling, or a window resize
    // mid-session), proportionally rescale the stored pane sizes so the store
    // tracks the live container. Allotment auto-rescales its rendered children
    // on container resize but does not fire onChange/onDragEnd, so without
    // this sync the store stays at whatever (possibly mid-expansion partial)
    // sizes the initial hydration captured. Consumers that read pane sizes
    // from the store (notably `getZoomToFitScale`) would otherwise compute
    // against stale values.
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

    // Handle toggle events for the debug pane (which will need a programmatic resize of the vertical pane)
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
                debugPaneViewport.height >
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
                debugPaneViewport.height ===
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
        debugPaneViewport.height,
        hasHydratedViewports,
        isDebugPaneMinimized,
        isDebugPaneMinimizedPrev,
        resizeVertical
    ]);

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

// Helper functions

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

const getDebugPaneLatchHeight = (
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

const getDefaultDebugPaneHeightForContent = (contentHeight: number) =>
    Math.floor(
        contentHeight * DEBUG_PANE_CONFIGURATION.preferredHeightPercentage
    );

const getDefaultHorizontalPaneWidth = (contentWidth: number) =>
    Math.floor(contentWidth * SPLIT_PANE_CONFIGURATION.defaultSizePercent);

const getDefaultPreviewDebugPaneSizes = (contentHeight: number) => [
    getDefaultVerticalPaneHeight(contentHeight),
    getDefaultDebugPaneHeightForContent(contentHeight)
];

const getDefaultVerticalPaneHeight = (contentHeight: number) =>
    Math.floor(
        contentHeight * (1 - DEBUG_PANE_CONFIGURATION.preferredHeightPercentage)
    );

const getDefaultVerticalPaneWidth = (contentWidth: number) =>
    Math.floor(
        contentWidth * (1 - SPLIT_PANE_CONFIGURATION.defaultSizePercent)
    );

const getPreviewDebugPaneResetSizes = (
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

const getPreviewDebugPaneSizes = (
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
