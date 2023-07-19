import React, { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { Link, useId, useToastController } from '@fluentui/react-components';

import store from '../../../store';
import { getI18nValue } from '../../i18n';
import {
    TOAST_NOTIFICATION_ID_APPLY_CHANGES,
    TOAST_NOTIFICATION_TIMEOUT
} from '../../../constants';
import { NotificationToast } from './notification-toast';
import { INotificationProps } from '.';
import { persistSpecification } from '../../specification';
import { discardChanges } from '../../../core/ui/commands';

export const NotificationApplyChanges: React.FC<INotificationProps> = ({
    toasterId
}) => {
    const { isDirty, mode } = store(
        (state) => ({
            isDirty: state.editor.isDirty,
            mode: state.interface.mode
        }),
        shallow
    );
    const toastId = useId(TOAST_NOTIFICATION_ID_APPLY_CHANGES);
    const { dispatchToast, dismissToast } = useToastController(toasterId);
    const handleApply = () => {
        dismissToast(toastId);
        persistSpecification(false);
    };
    const handleDiscard = () => {
        dismissToast(toastId);
        discardChanges();
    };
    const notify = () =>
        dispatchToast(
            <NotificationToast
                title={getI18nValue('Text_Toast_Title_Unapplied_Changes')}
                body={getI18nValue('Text_Toast_Body_Unapplied_Changes')}
                footer={
                    <>
                        <Link onClick={handleApply}>
                            {getI18nValue('Text_Toast_Action_Apply')}
                        </Link>
                        <Link onClick={handleDiscard}>
                            {getI18nValue('Text_Toast_Action_Discard')}
                        </Link>
                    </>
                }
            />,
            {
                toastId,
                intent: 'warning',
                timeout: TOAST_NOTIFICATION_TIMEOUT
            }
        );
    useEffect(() => {
        if (isDirty && mode === 'View') {
            notify();
        } else {
            dismissToast(toastId);
        }
    }, [isDirty, mode]);
    return <></>;
};
