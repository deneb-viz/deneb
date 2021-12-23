import React from 'react';
import {
    MessageBar,
    MessageBarType,
    IMessageBarStyles
} from '@fluentui/react/lib/MessageBar';

import { i18nValue } from '../../core/ui/i18n';

interface INotificationMessageBarProps {
    dismissAction: () => any;
    messageBarType: MessageBarType;
    visible: boolean;
    truncated?: boolean;
    isMultiline?: boolean;
    top?: boolean;
}

const messageBarTopStyles: IMessageBarStyles = {
    root: {
        position: 'fixed',
        top: 0
    }
};

const NotificationMessageBar: React.FC<INotificationMessageBarProps> = ({
    dismissAction,
    messageBarType,
    visible,
    truncated,
    isMultiline,
    top,
    children
}) => {
    const styles = top && messageBarTopStyles;
    const notification = () => (
        <>
            <MessageBar
                messageBarType={messageBarType}
                styles={styles}
                isMultiline={isMultiline}
                truncated={truncated}
                onDismiss={dismissAction}
                dismissButtonAriaLabel={i18nValue('Button_Dismiss_MessageBar')}
                overflowButtonAriaLabel={i18nValue(
                    'Button_See_More_MessageBar'
                )}
            >
                {children}
            </MessageBar>
        </>
    );
    return (visible && notification()) || <></>;
};

export default NotificationMessageBar;
