import { useEffect } from 'react';
import {
    Link,
    ToastTrigger,
    useId,
    useToastController
} from '@fluentui/react-components';

import { useDenebVisualState } from '../../../store';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import {
    NotificationProps,
    NotificationToast,
    TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED,
    TOAST_NOTIFICATION_TIMEOUT
} from '@deneb-viz/app-core';
import { InteractivityManager } from '@deneb-viz/powerbi-compat/interactivity';

export const NotificationCrossFilterExceeded = ({
    toasterId
}: NotificationProps) => {
    const {
        selectionLimit,
        selectionLimitExceeded,
        setSelectionLimitExceeded
    } = useDenebVisualState((state) => ({
        selectionLimit:
            state.settings.vega.interactivity.selectionMaxDataPoints.value,
        selectionLimitExceeded: state.interactivity.selectionLimitExceeded,
        setSelectionLimitExceeded: state.interactivity.setSelectionLimitExceeded
    }));
    const toastId = useId(TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED);
    const { dispatchToast, dismissToast } = useToastController(toasterId);
    const handleClearSelection = () => {
        dismissToast(toastId);
        InteractivityManager.crossFilter();
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
                    [selectionLimit]
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
                        setSelectionLimitExceeded(false);
                    }
                },
                timeout: TOAST_NOTIFICATION_TIMEOUT
            }
        );
    useEffect(() => {
        if (selectionLimitExceeded) {
            notify();
        } else {
            dismissToast(toastId);
        }
    }, [selectionLimitExceeded]);
    return <></>;
};
