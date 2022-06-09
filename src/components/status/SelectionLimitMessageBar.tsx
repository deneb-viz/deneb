import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import { useStoreProp, useStoreVegaProp } from '../../store';
import { i18nValue } from '../../core/ui/i18n';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import { reactLog } from '../../core/utils/reactLog';
import { dispatchCrossFilterAbort } from '../../features/interactivity';

const SelectionLimitMessageBar: React.FC = () => {
    const datasetHasSelectionAborted: boolean = useStoreProp(
        'datasetHasSelectionAborted'
    );

    const selectionMaxDataPoints = useStoreVegaProp<number>(
        'selectionMaxDataPoints'
    );
    reactLog('Rendering [SelectionLimitMessageBar]');
    return (
        <NotificationMessageBar
            dismissAction={dispatchCrossFilterAbort}
            messageBarType={MessageBarType.severeWarning}
            visible={datasetHasSelectionAborted}
            truncated={true}
            top={true}
        >
            {i18nValue('Selection_Aborted_Message', [selectionMaxDataPoints])}
        </NotificationMessageBar>
    );
};

export default SelectionLimitMessageBar;
