import { makeStyles } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import {
    SpecificationEditorProvider,
    useSpecificationEditor
} from '../../features/specification-editor';
import { CommandBar } from '../../features/command-bar';
import {
    FullContainerLayoutNoOverflow,
    ModalDialog
} from '../../components/ui';
import { PortalRoot } from '../editor/components/portal-root';
import { useDenebPlatformProvider } from '../../components/deneb-platform';
import { useEditorHotkeys, useEditorPaneLayout } from './hooks';
import { EditorPaneLayout } from '../editor/components/editor-pane-layout';

const EDITOR_CONTENT_ID = 'deneb-editor-content';
const EDITOR_PANE_CONTENT_ID = 'deneb-editor-pane-content';

const useEditorContentStyles = makeStyles({
    container: {
        display: 'flex',
        flex: '1 1 0',
        flexDirection: 'column',
        overflow: 'hidden'
    }
});

export const EditorContent = () => {
    const classes = useEditorContentStyles();
    const { launchUrl } = useDenebPlatformProvider();
    const editorRefs = useSpecificationEditor();

    // Register all hotkeys
    useEditorHotkeys(editorRefs, launchUrl);

    // Get pane layout state and handlers
    const {
        containerRef,
        containerWidth,
        containerHeight,
        hasHydratedViewports,
        paneHandleRefVertical,
        commitVerticalSizes,
        commitHorizontalSizes,
        handleVerticalChange,
        debugPaneViewport,
        editorPaneViewport,
        previewAreaViewport,
        position
    } = useEditorPaneLayout();

    logRender('EditorContent');
    return (
        <SpecificationEditorProvider>
            <div
                className={classes.container}
                id={EDITOR_CONTENT_ID}
                ref={containerRef}
            >
                {containerWidth && containerHeight && hasHydratedViewports && (
                    <FullContainerLayoutNoOverflow id={EDITOR_PANE_CONTENT_ID}>
                        <CommandBar />
                        <EditorPaneLayout
                            paneHandleRefVertical={paneHandleRefVertical}
                            editorPaneViewport={editorPaneViewport}
                            previewAreaViewport={previewAreaViewport}
                            debugPaneViewport={debugPaneViewport}
                            position={position}
                            onVerticalDragEnd={commitVerticalSizes}
                            onVerticalChange={handleVerticalChange}
                            onHorizontalDragEnd={commitHorizontalSizes}
                        />
                    </FullContainerLayoutNoOverflow>
                )}
            </div>
            <ModalDialog />
            <PortalRoot />
        </SpecificationEditorProvider>
    );
};
