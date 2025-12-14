import { useMemo } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { ActiveEditorPaneRouter } from '../../specification-editor';
import { useDenebState } from '../../../state';
import { type EditorPanePosition } from '../../../lib';

const useEditorPaneExpandedStyles = makeStyles({
    container: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        height: '100%'
    }
});

export const EditorPaneExpanded = () => {
    logRender('EditorPaneExpanded');
    const classes = useEditorPaneExpandedStyles();
    const { editorPaneWidth, editorPreviewAreaWidth, position, viewportWidth } =
        useDenebState((state) => ({
            editorPaneWidth: state.editorPaneWidth,
            editorPreviewAreaWidth: state.editorPreviewAreaWidth,
            position: state.visualSettings.editor.json.position
                .value as EditorPanePosition,
            viewportWidth: state.visualViewportCurrent.width
        }));
    const maxWidth = useMemo(
        () =>
            position === 'left'
                ? (editorPaneWidth ?? 0)
                : viewportWidth - (editorPreviewAreaWidth ?? 0),
        [editorPaneWidth, editorPreviewAreaWidth, position, viewportWidth]
    );
    return (
        <div id='editorPane' className={classes.container} style={{ maxWidth }}>
            <ActiveEditorPaneRouter />
        </div>
    );
};
