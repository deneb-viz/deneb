import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../store';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import { shallow } from 'zustand/shallow';
import { logRender } from '../../features/logging';

const FixErrorMessageBar: React.FC = () => {
    const { dismissed, error, success, setEditorFixErrorDismissed } = store(
        (state) => ({
            dismissed: state.editorFixResult.dismissed,
            error: state.editorFixResult.error,
            success: state.editorFixResult.success,
            setEditorFixErrorDismissed: state.setEditorFixErrorDismissed
        }),
        shallow
    );
    const dismissAction = () => setEditorFixErrorDismissed();
    const visible = !success && !dismissed;
    logRender('FixErrorMessageBar');
    return (
        <NotificationMessageBar
            dismissAction={dismissAction}
            messageBarType={MessageBarType.error}
            visible={visible}
        >
            {error}
        </NotificationMessageBar>
    );
};

export default FixErrorMessageBar;
