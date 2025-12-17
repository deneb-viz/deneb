import { useMemo } from 'react';
import SplitPane from 'react-split-pane';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../state';
import { DEBUG_PANE_CONFIGURATION } from '@deneb-viz/configuration';
import { RESIZER_HORIZONTAL_STYLES } from './styles';
import { PreviewArea } from '../../features/preview-area';
import { DebugArea } from '../../features/debug-area';
import { getPreviewAreaHeightMaximum } from '../../lib/interface/layout';

/**
 * The minimum vertical space that the preview area should be permitted to
 * occupy, and prevent the toolbar/debug pane from using all available space.
 */
const PREVIEW_PANE_AREA_MIN_SIZE = DEBUG_PANE_CONFIGURATION.areaMinSize;

export const SplitPaneOutput = () => {
    const {
        editorPreviewAreaHeight,
        viewportHeight,
        updateEditorPreviewAreaHeight
    } = useDenebState((state) => ({
        editorPreviewAreaHeight: state.editorPreviewAreaHeight,
        viewportHeight: state.interface.viewport?.height ?? 0,
        updateEditorPreviewAreaHeight: state.updateEditorPreviewAreaHeight
    }));
    const maxSize = useMemo(
        () => getPreviewAreaHeightMaximum(viewportHeight),
        [viewportHeight]
    );
    const handleResize = (size: number) => updateEditorPreviewAreaHeight(size);
    logRender('PreviewArea');
    return (
        <SplitPane
            split='horizontal'
            minSize={PREVIEW_PANE_AREA_MIN_SIZE}
            maxSize={maxSize}
            size={editorPreviewAreaHeight ?? 0}
            onChange={handleResize}
            allowResize={true}
            resizerStyle={RESIZER_HORIZONTAL_STYLES}
        >
            <PreviewArea />
            <DebugArea />
        </SplitPane>
    );
};
