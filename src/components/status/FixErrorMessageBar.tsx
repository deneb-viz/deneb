import * as React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../store';
import NotificationMessageBar from '../elements/NotificationMessageBar';

const FixErrorMessageBar: React.FC = () => {
    const { editorFixResult, setEditorFixErrorDismissed } = store(
        (state) => state
    );
    const dismissAction = () => setEditorFixErrorDismissed();
    const visible = !editorFixResult.success && !editorFixResult.dismissed;
    return (
        <NotificationMessageBar
            dismissAction={dismissAction}
            messageBarType={MessageBarType.error}
            visible={visible}
        >
            {editorFixResult.error}
        </NotificationMessageBar>
    );
};

export default FixErrorMessageBar;
