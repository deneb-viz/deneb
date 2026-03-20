import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { Allotment, type AllotmentHandle } from 'allotment';
import { usePrevious } from '@uidotdev/usehooks';

import { logRender } from '@deneb-viz/utils/logging';
import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';
import { ActiveEditorPaneRouter } from '../../specification-editor';
import { SpecificationEditorStatusBar } from '../../specification-editor/components/specification-editor-status-bar';
import { CompiledVegaPane } from '../../compiled-vega';
import { useDenebState } from '../../../state';
import { CursorProvider, useCursorContext } from '../../../context';

const STATUS_BAR_HEIGHT = DEBUG_PANE_CONFIGURATION.toolbarMinSize;
const COMPILED_VEGA_PANE_PREFERRED_SIZE = 300;
const COMPILED_VEGA_PANE_DRAG_THRESHOLD = 20;

const useEditorAreaStyles = makeStyles({
    pane: {
        height: '100%'
    },
    container: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        width: '100%'
    },
    editorContent: {
        display: 'flex',
        flex: '1 1 auto',
        height: '100%',
        overflow: 'hidden',
        width: '100%'
    },
    compiledPaneContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
    },
    compiledEditorContent: {
        flex: '1 1 auto',
        overflow: 'hidden'
    }
});

export const EditorArea = () => {
    logRender('EditorArea');
    const classes = useEditorAreaStyles();
    const {
        compiledVegaPaneHeight,
        isCompiledVegaPaneVisible,
        provider,
        setCompiledVegaPaneHeight,
        toggleCompiledVegaPane
    } = useDenebState((state) => ({
        compiledVegaPaneHeight: state.editor.compiledVegaPaneHeight,
        isCompiledVegaPaneVisible: state.editor.isCompiledVegaPaneVisible,
        provider: state.project.provider,
        setCompiledVegaPaneHeight: state.editor.setCompiledVegaPaneHeight,
        toggleCompiledVegaPane: state.editor.toggleCompiledVegaPane
    }));

    const isVegaLite = provider === 'vegaLite';

    // Allotment imperative resize (follows use-editor-pane-layout.ts pattern)
    const allotmentRef = useRef<AllotmentHandle>(null);
    const currentSizesRef = useRef<number[]>([]);
    const wasCompiledVisible = usePrevious(isCompiledVegaPaneVisible);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleChange = useCallback(
        (sizes: number[]) => {
            const prevSizes = currentSizesRef.current;
            currentSizesRef.current = sizes;
            if (sizes.length < 2) return;
            // Detect container resize (initial mount, or editor hidden→visible)
            // by checking if total available size changed. During sash dragging
            // the total stays constant, so this won't interfere with drag.
            const prevTotal =
                prevSizes.length >= 2 ? prevSizes[0] + prevSizes[1] : 0;
            const total = sizes[0] + sizes[1];
            const totalChanged = Math.abs(total - prevTotal) > 1;
            if (!totalChanged) return;
            if (isCompiledVegaPaneVisible) {
                // Restore latched height from previous session
                const latchHeight =
                    compiledVegaPaneHeight ??
                    COMPILED_VEGA_PANE_PREFERRED_SIZE + STATUS_BAR_HEIGHT;
                const expandedSize = Math.min(
                    latchHeight,
                    total - STATUS_BAR_HEIGHT
                );
                allotmentRef.current?.resize([
                    total - expandedSize,
                    expandedSize
                ]);
            } else {
                allotmentRef.current?.resize([
                    total - STATUS_BAR_HEIGHT,
                    STATUS_BAR_HEIGHT
                ]);
            }
        },
        [compiledVegaPaneHeight, isCompiledVegaPaneVisible]
    );

    const handleDragEnd = useCallback(
        (sizes: number[]) => {
            if (sizes.length < 2) return;
            const pane2Height = sizes[1];
            if (
                !isCompiledVegaPaneVisible &&
                pane2Height >
                    STATUS_BAR_HEIGHT + COMPILED_VEGA_PANE_DRAG_THRESHOLD
            ) {
                toggleCompiledVegaPane();
                setCompiledVegaPaneHeight(pane2Height);
            } else if (
                isCompiledVegaPaneVisible &&
                pane2Height <=
                    STATUS_BAR_HEIGHT + COMPILED_VEGA_PANE_DRAG_THRESHOLD
            ) {
                toggleCompiledVegaPane();
            } else if (isCompiledVegaPaneVisible) {
                setCompiledVegaPaneHeight(pane2Height);
            }
        },
        [
            isCompiledVegaPaneVisible,
            setCompiledVegaPaneHeight,
            toggleCompiledVegaPane
        ]
    );

    // Programmatic resize on toggle (expand/collapse)
    useLayoutEffect(() => {
        if (
            wasCompiledVisible === null ||
            wasCompiledVisible === undefined ||
            wasCompiledVisible === isCompiledVegaPaneVisible
        ) {
            return;
        }
        const sizes = currentSizesRef.current;
        if (sizes.length < 2) return;
        const total = sizes[0] + sizes[1];

        if (isCompiledVegaPaneVisible) {
            // Expanding: restore latched height
            const latchHeight =
                compiledVegaPaneHeight ?? COMPILED_VEGA_PANE_PREFERRED_SIZE;
            const expandedSize = Math.min(
                latchHeight,
                total - STATUS_BAR_HEIGHT
            );
            allotmentRef.current?.resize([total - expandedSize, expandedSize]);
        } else {
            // Collapsing: store current height, then collapse
            if (sizes[1] > STATUS_BAR_HEIGHT) {
                setCompiledVegaPaneHeight(sizes[1]);
            }
            allotmentRef.current?.resize([
                total - STATUS_BAR_HEIGHT,
                STATUS_BAR_HEIGHT
            ]);
        }
    }, [
        compiledVegaPaneHeight,
        isCompiledVegaPaneVisible,
        setCompiledVegaPaneHeight,
        wasCompiledVisible
    ]);

    // Override Allotment's default double-click reset with expand/reset-to-default.
    // Collapsed → expand to default size. Expanded → reset to default size (stay open).
    useEffect(() => {
        if (!isVegaLite) return;
        const container = containerRef.current;
        if (!container) return;
        const handler = (e: Event) => {
            if (!(e.target as HTMLElement)?.closest('.sash')) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            const sizes = currentSizesRef.current;
            if (sizes.length < 2) return;
            const total = sizes[0] + sizes[1];
            const defaultHeight =
                STATUS_BAR_HEIGHT + COMPILED_VEGA_PANE_PREFERRED_SIZE;
            const expandedSize = Math.min(
                defaultHeight,
                total - STATUS_BAR_HEIGHT
            );
            if (!isCompiledVegaPaneVisible) {
                // Expand — useLayoutEffect handles the resize via toggle
                toggleCompiledVegaPane();
            } else {
                // Already open — reset to default size
                allotmentRef.current?.resize([
                    total - expandedSize,
                    expandedSize
                ]);
                setCompiledVegaPaneHeight(expandedSize);
            }
        };
        container.addEventListener('dblclick', handler, true);
        return () => container.removeEventListener('dblclick', handler, true);
    }, [
        isVegaLite,
        isCompiledVegaPaneVisible,
        toggleCompiledVegaPane,
        setCompiledVegaPaneHeight
    ]);

    return (
        <Allotment.Pane
            className={classes.pane}
            preferredSize={`${SPLIT_PANE_CONFIGURATION.defaultSizePercent * 100}%`}
        >
            <CursorProvider>
                <div ref={containerRef} className={classes.container}>
                    {isVegaLite ? (
                        <Allotment
                            vertical
                            ref={allotmentRef}
                            onChange={handleChange}
                            onDragEnd={handleDragEnd}
                        >
                            <Allotment.Pane>
                                <div className={classes.editorContent}>
                                    <ActiveEditorPaneRouter />
                                </div>
                            </Allotment.Pane>
                            <Allotment.Pane
                                minSize={STATUS_BAR_HEIGHT}
                                preferredSize={STATUS_BAR_HEIGHT}
                            >
                                <div className={classes.compiledPaneContainer}>
                                    <SpecificationEditorStatusBar />
                                    {isCompiledVegaPaneVisible && (
                                        <div
                                            className={
                                                classes.compiledEditorContent
                                            }
                                        >
                                            <CompiledVegaPaneWithTooltip />
                                        </div>
                                    )}
                                </div>
                            </Allotment.Pane>
                        </Allotment>
                    ) : (
                        <>
                            <div className={classes.editorContent}>
                                <ActiveEditorPaneRouter />
                            </div>
                            <SpecificationEditorStatusBar />
                        </>
                    )}
                </div>
            </CursorProvider>
        </Allotment.Pane>
    );
};

const CompiledVegaPaneWithTooltip = () => {
    const { tooltipMountNode } = useCursorContext();
    return <CompiledVegaPane tooltipMountNode={tooltipMountNode} />;
};
