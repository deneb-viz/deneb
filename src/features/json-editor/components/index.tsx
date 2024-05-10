import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';

import { TEditorPosition } from '../../../core/ui';
import { POPOVER_Z_INDEX } from '../../../constants';

export const useEditorPaneStyles = makeStyles({
    buttonCollapsedLeft: {
        marginLeft: '2px'
    },
    buttonCollapsedRight: {
        marginRight: '2px'
    },
    paneContainerCollapsed: {
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        zIndex: POPOVER_Z_INDEX,
        ...shorthands.overflow('hidden')
    },
    paneContainerExpanded: {
        backgroundColor: tokens.colorNeutralBackground1,
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
