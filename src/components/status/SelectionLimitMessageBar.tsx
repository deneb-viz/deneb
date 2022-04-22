import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import { useStoreProp, useStoreVegaProp } from '../../store';
import { dispatchSelectionAborted } from '../../core/interactivity/selection';
import { i18nValue } from '../../core/ui/i18n';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import { reactLog } from '../../core/utils/reactLog';

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
            dismissAction={dispatchSelectionAborted}
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
