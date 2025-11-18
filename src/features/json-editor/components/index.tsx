import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { type EditorPanePosition } from '@deneb-viz/app-core';

export const useEditorPaneStyles = makeStyles({
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
        ...shorthands.overflow('hidden')
    },
    paneContainerSurround: {
        alignItems: 'end',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 999
    },
    paneContainerExpanded: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        height: '100%'
    }
});

export const getEditorPaneStateIcon = (
    expanded: boolean,
    position: EditorPanePosition
) =>
    (position === 'left' && expanded) || (position === 'right' && !expanded) ? (
        <ChevronLeftRegular />
    ) : (
        <ChevronRightRegular />
    );
