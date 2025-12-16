import { useMemo, useState } from 'react';
import {
    Button,
    makeStyles,
    tokens,
    Tooltip
} from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';

import { useDenebState } from '../../../state';
import { TooltipCustomMount } from '../../../components/ui';
import { handleToggleEditorPane } from '../../../lib';

const useEditorPaneCollapsedStyles = makeStyles({
    buttonCollapsedLeft: {
        marginLeft: '2px'
    },
    buttonCollapsedRight: {
        marginRight: '2px'
    },
    paneContainerCollapsed: {
        width: '100%',
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        position: 'absolute',
        overflow: 'hidden'
    },
    paneContainerSurround: {
        alignItems: 'end',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 999
    }
});

export const EditorPaneCollapsed = () => {
    const { editorPaneIsExpanded, position, translate } = useDenebState(
        (state) => ({
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            position: state.visualSettings.editor.json.position.value,
            translate: state.i18n.translate
        })
    );
    const classes = useEditorPaneCollapsedStyles();
    const icon = useMemo(
        () =>
            (position === 'left' && editorPaneIsExpanded) ||
            (position === 'right' && !editorPaneIsExpanded) ? (
                <ChevronLeftRegular />
            ) : (
                <ChevronRightRegular />
            ),
        [editorPaneIsExpanded, position]
    );
    const buttonClass = useMemo(
        () =>
            position === 'left'
                ? classes.buttonCollapsedLeft
                : classes.buttonCollapsedRight,
        [position]
    );
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <div id='editorPane' className={classes.paneContainerCollapsed}>
            <div className={classes.paneContainerSurround}>
                <Tooltip
                    content={translate('Tooltip_Expand_Editor_Pane')}
                    relationship='label'
                    withArrow
                    mountNode={ref}
                >
                    <Button
                        icon={icon}
                        onClick={handleToggleEditorPane}
                        className={buttonClass}
                        appearance='subtle'
                    />
                </Tooltip>
                <TooltipCustomMount setRef={setRef} />
            </div>
        </div>
    );
};
