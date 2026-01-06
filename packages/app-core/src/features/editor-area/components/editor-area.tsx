import { makeStyles, tokens } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { ActiveEditorPaneRouter } from '../../specification-editor';
import { Allotment } from 'allotment';
import { SPLIT_PANE_CONFIGURATION } from '@deneb-viz/configuration';

const useEditorPaneExpandedStyles = makeStyles({
    pane: {
        height: '100%'
    },
    container: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        height: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        width: '100%'
    }
});

export const EditorArea = () => {
    logRender('EditorArea');
    const classes = useEditorPaneExpandedStyles();
    return (
        <Allotment.Pane
            className={classes.pane}
            preferredSize={`${SPLIT_PANE_CONFIGURATION.defaultSizePercent * 100}%`}
        >
            <div id='editorPane' className={classes.container}>
                <ActiveEditorPaneRouter />
            </div>
        </Allotment.Pane>
    );
};
