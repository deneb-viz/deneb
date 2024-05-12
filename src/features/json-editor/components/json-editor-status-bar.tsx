import React from 'react';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';

import { logRender } from '../../logging';
import { StatusBarContainer } from '../../interface';
import { getI18nValue } from '../../i18n';
import { ToolbarButtonStandard } from '../../toolbar/components/toolbar-button-standard';
import { PREVIEW_PANE_TOOLBAR_MIN_SIZE } from '../../../constants';

interface IStatusBarProps {
    position: Ace.Point;
    selectedText: string;
    escapeHatch: boolean;
    clearTokenTooltip?: () => Element;
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
        columnGap: '20px',
        height: '100%'
    }
});

/**
 * Represents the status bar at the bottom of the editor.
 */
export const JsonEditorStatusBar: React.FC<IStatusBarProps> = ({
    position,
    selectedText,
    escapeHatch,
    clearTokenTooltip
}) => {
    const classes = useStatusStyles();
    const row = position.row + 1;
    const column = position.column + 1;
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
                    <div
                        className={classes.status}
                        onMouseEnter={clearTokenTooltip}
                        onMouseMove={clearTokenTooltip}
                    >
                        <div className='status-cursor'>
                            <Caption1>
                                {getI18nValue('Text_Editor_Status_Bar_Line')}{' '}
                                {row}{' '}
                                {getI18nValue('Text_Editor_Status_Bar_Column')}{' '}
                                {column} {getSelectedTextMessage(selectedText)}
                            </Caption1>
                        </div>
                        <div className='status-tabbing'>
                            <Caption1>
                                {escapeHatch
                                    ? getI18nValue(
                                          'Text_Editor_Status_Bar_Tab_Focus'
                                      )
                                    : getI18nValue(
                                          'Text_Editor_Status_Bar_Tab_Edit'
                                      )}{' '}
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
