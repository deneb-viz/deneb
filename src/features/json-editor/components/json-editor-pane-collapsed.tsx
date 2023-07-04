import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { Button, Tooltip } from '@fluentui/react-components';

import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { getEditorPaneStateIcon, useJsonEditorStyles } from '.';
import { handleEditorPane } from '../../../core/ui/commands';

const JsonEditorPaneCollapsed: React.FC = () => {
    const { editorPaneIsExpanded, position } = store(
        (state) => ({
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            position: state.visualSettings.editor.position
        }),
        shallow
    );
    const classes = useJsonEditorStyles();
    const icon = useMemo(
        () => getEditorPaneStateIcon(editorPaneIsExpanded, position),
        [editorPaneIsExpanded, position]
    );
    const buttonClass = useMemo(
        () =>
            position === 'left'
                ? classes.buttonCollapsedLeft
                : classes.buttonCollapsedRight,
        [position]
    );
    return (
        <div id='editorPane' className={classes.paneContainerCollapsed}>
            <Tooltip
                content={getI18nValue('Tooltip_Expand_Editor_Pane')}
                relationship='label'
                withArrow
            >
                <Button
                    icon={icon}
                    onClick={handleEditorPane}
                    className={buttonClass}
                    appearance='subtle'
                />
            </Tooltip>
        </div>
    );
};

export default JsonEditorPaneCollapsed;
