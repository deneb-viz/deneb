import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import { state } from '../../store';
import { dismissFixError } from '../../store/visualReducer';
import { getHostLM } from '../../api/i18n';

const FixErrorDetails: React.FC = () => {
    const { fixResult: fixStatus } = useSelector(state).visual,
        i18n = getHostLM(),
        dispatch = useDispatch(),
        handleDismiss = () => {
            dispatch(dismissFixError());
        };

    if (!fixStatus.success && !fixStatus.dismissed) {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={handleDismiss}
                dismissButtonAriaLabel={i18n.getDisplayName(
                    'Button_Dismiss_MessageBar'
                )}
            >
                {fixStatus.error}
            </MessageBar>
        );
    }

    return <> </>;
};

export default FixErrorDetails;
