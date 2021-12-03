import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';

const FixErrorDetails: React.FC = () => {
    const { editorFixResult, setEditorFixErrorDismissed } = store(
            (state) => state
        ),
        handleDismiss = () => {
            setEditorFixErrorDismissed();
        };

    if (!editorFixResult.success && !editorFixResult.dismissed) {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={handleDismiss}
                dismissButtonAriaLabel={i18nValue('Button_Dismiss_MessageBar')}
            >
                {editorFixResult.error}
            </MessageBar>
        );
    }

    return <> </>;
};

export default FixErrorDetails;
