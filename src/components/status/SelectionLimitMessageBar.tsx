import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { shallow } from 'zustand/shallow';

import store from '../../store';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import { dispatchCrossFilterAbort } from '../../features/interactivity';
import { logRender } from '../../features/logging';
import { getI18nValue } from '../../features/i18n';

const SelectionLimitMessageBar: React.FC = () => {
    const { datasetHasSelectionAborted, selectionMaxDataPoints } = store(
        (state) => ({
            datasetHasSelectionAborted: state.datasetHasSelectionAborted,
            selectionMaxDataPoints:
                state.visualSettings.vega.selectionMaxDataPoints
        }),
        shallow
    );
    logRender('SelectionLimitMessageBar');
    return (
        <NotificationMessageBar
            dismissAction={dispatchCrossFilterAbort}
            messageBarType={MessageBarType.severeWarning}
            visible={datasetHasSelectionAborted}
            truncated={true}
            top={true}
        >
            {getI18nValue('Selection_Aborted_Message', [
                selectionMaxDataPoints
            ])}
        </NotificationMessageBar>
    );
};

export default SelectionLimitMessageBar;
