import React from 'react';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import { Caption1, makeStyles } from '@fluentui/react-components';

import { logRender } from '../../logging';
import { StatusBarContainer } from '../../interface';
import { getI18nValue } from '../../i18n';

interface IStatusBarProps {
    position: Ace.Point;
    selectedText: string;
    escapeHatch: boolean;
    clearTokenTooltip?: () => Element;
}

const useStatusStyles = makeStyles({
    statusBarContainer: {
        display: 'flex',
        flexDirection: 'row',
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
            <div
                className={classes.statusBarContainer}
                onMouseEnter={clearTokenTooltip}
                onMouseMove={clearTokenTooltip}
            >
                <div className='status-cursor'>
                    <Caption1>
                        {getI18nValue('Text_Editor_Status_Bar_Line')} {row}{' '}
                        {getI18nValue('Text_Editor_Status_Bar_Column')} {column}{' '}
                        {getSelectedTextMessage(selectedText)}
                    </Caption1>
                </div>
                <div className='status-tabbing'>
                    <Caption1>
                        {escapeHatch
                            ? getI18nValue('Text_Editor_Status_Bar_Tab_Focus')
                            : getI18nValue(
                                  'Text_Editor_Status_Bar_Tab_Edit'
                              )}{' '}
                    </Caption1>
                </div>
                <div className='status-settings'></div>
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
