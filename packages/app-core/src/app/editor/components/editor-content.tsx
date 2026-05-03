import { useLayoutEffect, useState } from 'react';
import { makeStyles } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { useSpecificationEditor } from '../../../features/specification-editor';
import { CommandBar } from '../../../features/command-bar';
import { FullContainerLayoutNoOverflow } from '../../../components/ui';
import { PortalRoot } from './portal-root';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { markEditorOpenStage } from '../../../lib/perf';
import { useEditorHotkeys, useEditorPaneLayout } from '../hooks';
import { EditorPaneLayout } from './editor-pane-layout';

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

    // Sticky "have we ever been laid out" latch. The pane layout is
    // gated on the container having a positive measurement, but with
    // retention (RetainedDenebEditor) the wrapper above us briefly goes
    // `display: none`, which drops the measurement to 0. Without this
    // latch the conditional below would unmount EditorPaneLayout (and
    // its Monaco / Allotment / Vega children) every time the user
    // toggles back to viewer, defeating retention. Once we've rendered
    // once, we stay rendered.
    //
    // This also serves as the marker trigger for the viewport-freeze
    // investigation — the latch flipping from false to true is exactly
    // the "first paint with a hydrated container" moment.
    const [hasRenderedLayout, setHasRenderedLayout] = useState(false);
    useLayoutEffect(() => {
        if (
            !hasRenderedLayout &&
            containerWidth &&
            containerHeight &&
            hasHydratedViewports
        ) {
            setHasRenderedLayout(true);
            markEditorOpenStage('content-paint');
        }
    }, [
        hasRenderedLayout,
        containerWidth,
        containerHeight,
        hasHydratedViewports
    ]);

    logRender('EditorContent');
    return (
        <>
            <div
                className={classes.container}
                id={EDITOR_CONTENT_ID}
                ref={containerRef}
            >
                {hasRenderedLayout && (
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
            <PortalRoot />
        </>
    );
};
