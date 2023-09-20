import React, { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import {
    Link,
    ToastTrigger,
    useId,
    useToastController
} from '@fluentui/react-components';

import store from '../../../store';
import { clearSelection, dispatchCrossFilterAbort } from '../../interactivity';
import { getI18nValue } from '../../i18n';
import {
    TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED,
    TOAST_NOTIFICATION_TIMEOUT
} from '../../../constants';
import { NotificationToast } from './notification-toast';
import { INotificationProps } from '.';

export const NotificationCrossFilterExceeded: React.FC<INotificationProps> = ({
    toasterId
}) => {
    const { datasetHasSelectionAborted, selectionMaxDataPoints } = store(
        (state) => ({
            datasetHasSelectionAborted: state.datasetHasSelectionAborted,
            selectionMaxDataPoints:
                state.visualSettings.vega.selectionMaxDataPoints
        }),
        shallow
    );
    const toastId = useId(TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED);
    const { dispatchToast, dismissToast } = useToastController(toasterId);
    const handleClearSelection = () => {
        dismissToast(toastId);
        clearSelection();
    };
    const notify = () =>
        dispatchToast(
            <NotificationToast
                title={getI18nValue(
                    'Text_Toast_Title_Cross_Filter_Limit_Reached'
                )}
                subtitle={getI18nValue(
                    'Text_Toast_Subtitle_Cross_Filter_Limit_Reached'
                )}
                body={getI18nValue(
                    'Text_Toast_Body_Cross_Filter_Limit_Reached',
                    [selectionMaxDataPoints]
                )}
                footer={
                    <>
                        <ToastTrigger>
                            <Link>
                                {getI18nValue('Text_Toast_Action_Dismiss')}
                            </Link>
                        </ToastTrigger>
                        <Link onClick={handleClearSelection}>
                            {getI18nValue(
                                'Text_Toast_Action_Dismiss_Clear_Selection'
                            )}
                        </Link>
                    </>
                }
            />,
            {
                toastId,
                intent: 'warning',
                onStatusChange: (e, { status: toastStatus }) => {
                    if (toastStatus === 'dismissed') {
                        dispatchCrossFilterAbort();
                    }
                },
                timeout: TOAST_NOTIFICATION_TIMEOUT
            }
        );
    useEffect(() => {
        if (datasetHasSelectionAborted) {
            notify();
        } else {
            dismissToast(toastId);
        }
    }, [datasetHasSelectionAborted]);
    return <></>;
};
