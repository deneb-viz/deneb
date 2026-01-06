import type { RefObject } from 'react';
import { Allotment, type AllotmentHandle } from 'allotment';

import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import type { EditorPanePosition } from '../../../lib';
import { EditorArea } from '../../../features/editor-area';
import { PreviewArea } from '../../../features/preview-area';
import { DebugArea } from '../../../features/debug-area';

interface EditorPaneLayoutProps {
    /** Ref for programmatic vertical pane resizing */
    paneHandleRefVertical: RefObject<AllotmentHandle | null>;
    /** Editor pane viewport dimensions */
    editorPaneViewport: { width: number; height: number };
    /** Preview area viewport dimensions */
    previewAreaViewport: { width: number; height: number };
    /** Debug pane viewport dimensions */
    debugPaneViewport: { width: number; height: number };
    /** Position of the editor pane */
    position: EditorPanePosition;
    /** Callback when vertical pane drag ends */
    onVerticalDragEnd: (sizes: number[]) => void;
    /** Callback when vertical pane sizes change (including reset) */
    onVerticalChange: (sizes: number[]) => void;
    /** Callback when horizontal pane drag ends */
    onHorizontalDragEnd: (sizes: number[]) => void;
}

/**
 * Component that renders the editor layout with resizable panes.
 * Handles the horizontal split between editor and preview/debug areas,
 * and the vertical split between preview and debug panes.
 */
export const EditorPaneLayout = ({
    paneHandleRefVertical,
    editorPaneViewport,
    previewAreaViewport,
    debugPaneViewport,
    position,
    onVerticalDragEnd,
    onVerticalChange,
    onHorizontalDragEnd
}: EditorPaneLayoutProps) => {
    const previewDebugPane = (
        <Allotment.Pane minSize={DEBUG_PANE_CONFIGURATION.minWidth}>
            <Allotment
                vertical
                ref={paneHandleRefVertical}
                defaultSizes={[
                    previewAreaViewport.height,
                    debugPaneViewport.height
                ]}
                onChange={onVerticalChange}
                onDragEnd={onVerticalDragEnd}
            >
                <Allotment.Pane>
                    <PreviewArea />
                </Allotment.Pane>
                <Allotment.Pane
                    minSize={DEBUG_PANE_CONFIGURATION.toolbarMinSize}
                    preferredSize={`${DEBUG_PANE_CONFIGURATION.preferredHeightPercentage * 100}%`}
                >
                    <DebugArea />
                </Allotment.Pane>
            </Allotment>
        </Allotment.Pane>
    );

    return (
        <Allotment
            defaultSizes={[editorPaneViewport.width, previewAreaViewport.width]}
            onDragEnd={onHorizontalDragEnd}
        >
            {position === 'left' ? <EditorArea /> : previewDebugPane}
            {position === 'left' ? previewDebugPane : <EditorArea />}
        </Allotment>
    );
};
