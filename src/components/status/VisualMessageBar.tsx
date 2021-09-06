import React from 'react';
import { useSelector } from 'react-redux';
import {
    MessageBar,
    MessageBarType,
    IMessageBarStyles
} from '@fluentui/react/lib/MessageBar';

import { state } from '../../store';
import { dispatchSelectionAborted } from '../../core/interactivity/selection';
import { i18nValue } from '../../core/ui/i18n';

const messageBarStyles: IMessageBarStyles = {
    root: {
        position: 'fixed',
        top: 0
    }
};

const VisualMessageBar: React.FC = () => {
    const { isSelectionAborted, settings } = useSelector(state).visual,
        { selectionMaxDataPoints } = settings.vega,
        handleDismiss = () => dispatchSelectionAborted(),
        notification = () => (
            <>
                <MessageBar
                    messageBarType={MessageBarType.severeWarning}
                    styles={messageBarStyles}
                    isMultiline={false}
                    truncated={true}
                    onDismiss={handleDismiss}
                    dismissButtonAriaLabel={i18nValue(
                        'Button_Dismiss_MessageBar'
                    )}
                    overflowButtonAriaLabel={i18nValue(
                        'Button_See_More_MessageBar'
                    )}
                >
                    {i18nValue('Selection_Aborted_Message', [
                        selectionMaxDataPoints
                    ])}
                </MessageBar>
            </>
        );
    return (isSelectionAborted && notification()) || <></>;
};

export default VisualMessageBar;
