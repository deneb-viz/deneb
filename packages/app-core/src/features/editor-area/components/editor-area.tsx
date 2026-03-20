import { useCallback, useEffect, useRef } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Allotment, type AllotmentHandle } from 'allotment';

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
    compiledEditorContent: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
    const isCompiledPaneShown = isVegaLite && isCompiledVegaPaneVisible;

    const allotmentRef = useRef<AllotmentHandle>(null);
    const currentSizesRef = useRef<number[]>([]);

    const handleChange = useCallback(
        (sizes: number[]) => {
            const prevSizes = currentSizesRef.current;
            currentSizesRef.current = sizes;
            if (sizes.length < 2) return;
            // Detect container resize (initial mount, editor hidden→visible,
            // or Power BI viewport settling). During sash drag the total stays
            // constant, so this won't interfere.
            const prevTotal = prevSizes.reduce((a, b) => a + b, 0);
            const total = sizes.reduce((a, b) => a + b, 0);
            if (Math.abs(total - prevTotal) <= 1) return;
            if (isCompiledPaneShown && sizes.length >= 3) {
                const latchHeight =
                    compiledVegaPaneHeight ?? COMPILED_VEGA_PANE_PREFERRED_SIZE;
                const expandedSize = Math.min(
                    latchHeight,
                    total - STATUS_BAR_HEIGHT
                );
                allotmentRef.current?.resize([
                    total - STATUS_BAR_HEIGHT - expandedSize,
                    STATUS_BAR_HEIGHT,
                    expandedSize
                ]);
            }
        },
        [compiledVegaPaneHeight, isCompiledPaneShown]
    );

    const handleDragEnd = useCallback(
        (sizes: number[]) => {
            // Pane 3 is the compiled area (index 2)
            if (sizes.length < 3) return;
            const compiledHeight = sizes[2];
            if (compiledHeight > 0) {
                setCompiledVegaPaneHeight(compiledHeight);
            }
        },
        [setCompiledVegaPaneHeight]
    );

    // When the compiled pane becomes visible via the toggle button,
    // Allotment shows it but we need to set its initial size.
    // onVisibleChange fires when Allotment processes the visible prop change.
    const handleVisibleChange = useCallback(
        (_index: number, visible: boolean) => {
            if (visible) {
                const sizes = currentSizesRef.current;
                if (sizes.length < 2) return;
                const total = sizes.reduce((a, b) => a + b, 0);
                const latchHeight =
                    compiledVegaPaneHeight ?? COMPILED_VEGA_PANE_PREFERRED_SIZE;
                const expandedSize = Math.min(
                    latchHeight,
                    total - STATUS_BAR_HEIGHT
                );
                allotmentRef.current?.resize([
                    total - STATUS_BAR_HEIGHT - expandedSize,
                    STATUS_BAR_HEIGHT,
                    expandedSize
                ]);
            } else {
                // Collapsing: latch current height
                const sizes = currentSizesRef.current;
                if (sizes.length >= 3 && sizes[2] > 0) {
                    setCompiledVegaPaneHeight(sizes[2]);
                }
            }
        },
        [compiledVegaPaneHeight, setCompiledVegaPaneHeight]
    );

    // Override Allotment's default double-click on sash.
    // Only the sash between pane 2 and pane 3 matters (VL only).
    useEffect(() => {
        if (!isVegaLite) return;
        const container = document.querySelector(
            '.compiled-vega-allotment'
        ) as HTMLElement | null;
        if (!container) return;
        const handler = (e: Event) => {
            if (!(e.target as HTMLElement)?.closest('.sash')) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            if (!isCompiledVegaPaneVisible) {
                toggleCompiledVegaPane();
            } else {
                // Reset to default size
                const sizes = currentSizesRef.current;
                if (sizes.length < 3) return;
                const total = sizes.reduce((a, b) => a + b, 0);
                const defaultHeight = COMPILED_VEGA_PANE_PREFERRED_SIZE;
                const expandedSize = Math.min(
                    defaultHeight,
                    total - STATUS_BAR_HEIGHT
                );
                allotmentRef.current?.resize([
                    total - STATUS_BAR_HEIGHT - expandedSize,
                    STATUS_BAR_HEIGHT,
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
                <div className={mergeClasses(classes.container, 'compiled-vega-allotment')}>
                    <Allotment
                        vertical
                        ref={allotmentRef}
                        onChange={handleChange}
                        onDragEnd={handleDragEnd}
                        onVisibleChange={handleVisibleChange}
                    >
                        <Allotment.Pane>
                            <div className={classes.editorContent}>
                                <ActiveEditorPaneRouter />
                            </div>
                        </Allotment.Pane>
                        <Allotment.Pane
                            minSize={STATUS_BAR_HEIGHT}
                            maxSize={STATUS_BAR_HEIGHT}
                        >
                            <SpecificationEditorStatusBar />
                        </Allotment.Pane>
                        <Allotment.Pane
                            visible={isCompiledPaneShown}
                            preferredSize={
                                compiledVegaPaneHeight ??
                                COMPILED_VEGA_PANE_PREFERRED_SIZE
                            }
                        >
                            <div className={classes.compiledEditorContent}>
                                <CompiledVegaPaneWithTooltip />
                            </div>
                        </Allotment.Pane>
                    </Allotment>
                </div>
            </CursorProvider>
        </Allotment.Pane>
    );
};

const CompiledVegaPaneWithTooltip = () => {
    const { tooltipMountNode } = useCursorContext();
    return <CompiledVegaPane tooltipMountNode={tooltipMountNode} />;
};
