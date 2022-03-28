import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import { useStoreProp } from '../../store';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import { reactLog } from '../../core/utils/logger';

const FixErrorMessageBar: React.FC = () => {
    const success = useStoreProp<boolean>('success', 'editorFixResult');
    const dismissed = useStoreProp<boolean>('dismissed', 'editorFixResult');
    const error = useStoreProp<boolean>('error', 'editorFixResult');
    const setEditorFixErrorDismissed = useStoreProp<() => void>(
        'setEditorFixErrorDismissed'
    );
    const dismissAction = () => setEditorFixErrorDismissed();
    const visible = !success && !dismissed;
    reactLog('Rendering [FixErrorMessageBar]');
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
