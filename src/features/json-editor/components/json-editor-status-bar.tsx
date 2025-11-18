import React from 'react';
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';

import { logRender } from '../../logging';
import { StatusBarContainer } from '../../interface';
import { getI18nValue } from '../../i18n';
import { ToolbarButtonStandard } from '../../toolbar/components/toolbar-button-standard';
import { ProviderDetail } from './provider-detail';
import { TrackingSyncStatus } from './tracking-sync-status';
import { monaco, PREVIEW_PANE_TOOLBAR_MIN_SIZE } from '@deneb-viz/app-core';

interface IStatusBarProps {
    position: monaco.Position;
    selectedText: string;
}

const useStatusStyles = makeStyles({
    surround: {
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px}`,
        width: '100%',
        position: 'absolute',
        zIndex: 5
    },
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: '5px',
        height: '100%',
        width: '100%'
    },
    collapse: {
        paddingLeft: tokens.spacingHorizontalXS
    },
    status: {
        display: 'flex',
        flexDirection: 'row',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        columnGap: '10px',
        height: '100%'
    },
    cursorContainer: {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    caption: {
        whiteSpace: 'nowrap'
    }
});

/**
 * Represents the status bar at the bottom of the editor.
 */
export const JsonEditorStatusBar: React.FC<IStatusBarProps> = ({
    position,
    selectedText
}) => {
    const classes = useStatusStyles();
    const row = position.lineNumber;
    const column = position.column;
    logRender('JsonEditorStatusBar');
    return (
        <StatusBarContainer>
            <div className={classes.surround}>
                <div className={classes.container}>
                    <div className={classes.collapse}>
                        <ToolbarButtonStandard
                            command='editorPaneToggle'
                            role='debug'
                        />
                    </div>
                    <ProviderDetail />
                    <div className={classes.status}>
                        <TrackingSyncStatus />
                        <div className={classes.cursorContainer}>
                            <Caption1 className={classes.caption}>
                                {getI18nValue('Text_Editor_Status_Bar_Line')}{' '}
                                {row}{' '}
                                {getI18nValue('Text_Editor_Status_Bar_Column')}{' '}
                                {column} {getSelectedTextMessage(selectedText)}
                            </Caption1>
                        </div>
                        <div className='status-settings'></div>
                    </div>
                </div>
            </div>
        </StatusBarContainer>
    );
};

/**
 * Handles display of the correct message when the user has selected text.
 */
const getSelectedTextMessage = (selectedText: string) => {
    const selectionLength = selectedText.length;
    return selectionLength > 0
        ? getI18nValue('Text_Editor_Status_Bar_Selection', [selectionLength])
        : '';
};
