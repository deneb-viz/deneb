import React, { useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Button, Tooltip } from '@fluentui/react-components';

import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { getEditorPaneStateIcon, useEditorPaneStyles } from '.';
import { TooltipCustomMount } from '../../interface';
import { handleToggleEditorPane } from '../../commands';

export const EditorPaneCollapsed: React.FC = () => {
    const { editorPaneIsExpanded, position } = store(
        (state) => ({
            editorPaneIsExpanded: state.editorPaneIsExpanded,
            position: state.visualSettings.editor.position
        }),
        shallow
    );
    const classes = useEditorPaneStyles();
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
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <div id='editorPane' className={classes.paneContainerCollapsed}>
            <>
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
            </>
        </div>
    );
};
