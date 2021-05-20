import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { dismissFixError } from '../../store/visualReducer';

const FixErrorDetails: React.FC = () => {
    Debugger.log('Rendering Component: [FixErrorDetails]...');
    const { fixResult: fixStatus, i18n } = useSelector(state).visual,
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
