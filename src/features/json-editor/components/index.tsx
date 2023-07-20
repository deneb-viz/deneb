import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';

import { TEditorPosition } from '../../../core/ui';

export const useEditorPaneStyles = makeStyles({
    buttonCollapsedLeft: {
        marginLeft: '2px'
    },
    buttonCollapsedRight: {
        marginRight: '2px'
    },
    paneContainerCollapsed: {
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.overflow('hidden')
    },
    paneContainerExpanded: {
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        height: '100%'
    }
});

export const getEditorPaneStateIcon = (
    expanded: boolean,
    position: TEditorPosition
) =>
    (position === 'left' && expanded) || (position === 'right' && !expanded) ? (
        <ChevronLeftRegular />
    ) : (
        <ChevronRightRegular />
    );