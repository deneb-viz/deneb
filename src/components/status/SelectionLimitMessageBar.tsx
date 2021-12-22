import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../store';
import { dispatchSelectionAborted } from '../../core/interactivity/selection';
import { i18nValue } from '../../core/ui/i18n';
import NotificationMessageBar from '../elements/NotificationMessageBar';

const SelectionLimitMessageBar: React.FC = () => {
    const { datasetHasSelectionAborted, visualSettings } = store(
        (state) => state
    );
    const { selectionMaxDataPoints } = visualSettings.vega;
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
