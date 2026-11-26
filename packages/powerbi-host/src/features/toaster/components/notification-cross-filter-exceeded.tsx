import { useEffect, useRef } from 'react';
import {
    Link,
    ToastTrigger,
    useId,
    useToastController
} from '@fluentui/react-components';

import { InteractivityManager } from '../../../lib/interactivity';
import { useDenebVisualState } from '../../../state';
import { type NotificationProps } from '../types';
import { NotificationToast } from './notification-toast';
import {
    TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED,
    TOAST_NOTIFICATION_TIMEOUT
} from '../constants';
import { useDenebState } from '@deneb-viz/app-core';

export const NotificationCrossFilterExceeded = ({
    toasterId
}: NotificationProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const {
        selectionLimit,
        selectionLimitExceeded,
        setSelectionLimitExceeded
    } = useDenebVisualState((state) => ({
        selectionLimit: state.interactivity.selectionLimit,
        selectionLimitExceeded: state.interactivity.selectionLimitExceeded,
        setSelectionLimitExceeded: state.interactivity.setSelectionLimitExceeded
    }));
    const toastId = useId(TOAST_NOTIFICATION_ID_CROSS_FILTER_EXCEEDED);
    const { dispatchToast, dismissToast, updateToast } =
        useToastController(toasterId);
    const handleClearSelection = () => {
        dismissToast(toastId);
        InteractivityManager.crossFilter();
    };
    const getToastContent = () => (
        <NotificationToast
            title={translate('PowerBI_Toast_Title_Cross_Filter_Limit_Reached')}
            subtitle={translate(
                'PowerBI_Toast_Subtitle_Cross_Filter_Limit_Reached'
            )}
            body={translate('PowerBI_Toast_Body_Cross_Filter_Limit_Reached', [
                selectionLimit
            ])}
            footer={
                <>
                    <ToastTrigger>
                        <Link>{translate('PowerBI_Toast_Action_Dismiss')}</Link>
                    </ToastTrigger>
                    <Link onClick={handleClearSelection}>
                        {translate(
                            'PowerBI_Toast_Action_Dismiss_Clear_Selection'
                        )}
                    </Link>
                </>
            }
        />
    );
    const notify = () =>
        dispatchToast(getToastContent(), {
            toastId,
            intent: 'warning',
            onStatusChange: (e, { status: toastStatus }) => {
                if (toastStatus === 'dismissed') {
                    setSelectionLimitExceeded(false);
                }
            },
            timeout: TOAST_NOTIFICATION_TIMEOUT
        });
    // The toast stays open until it is dismissed, and each refused action can
    // apply a different limit. Fluent ignores a second dispatch for a toast ID
    // that is still open, so an open toast is updated in place.
    const isToastOpen = useRef(false);
    useEffect(() => {
        if (!selectionLimitExceeded) {
            dismissToast(toastId);
        } else if (isToastOpen.current) {
            updateToast({ toastId, content: getToastContent() });
        } else {
            notify();
        }
        isToastOpen.current = selectionLimitExceeded;
    }, [selectionLimitExceeded, selectionLimit]);
    return <></>;
};
