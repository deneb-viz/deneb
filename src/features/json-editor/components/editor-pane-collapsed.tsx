import React, { useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Button, Tooltip } from '@fluentui/react-components';

import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { getEditorPaneStateIcon, useEditorPaneStyles } from '.';
import { handleToggleEditorPane } from '../../commands';
import {
    TooltipCustomMount,
    type EditorPanePosition
} from '@deneb-viz/app-core';

export const EditorPaneCollapsed: React.FC = () => {
    const { editorPaneIsExpanded, position } = store(
        (state) => ({
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            position: state.visualSettings.editor.json.position.value
        }),
        shallow
    );
    const classes = useEditorPaneStyles();
    const icon = useMemo(
        () =>
            getEditorPaneStateIcon(
                editorPaneIsExpanded,
                position as EditorPanePosition
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
                    content={getI18nValue('Tooltip_Expand_Editor_Pane')}
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
