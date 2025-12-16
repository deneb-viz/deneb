import { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { Link, useId, useToastController } from '@fluentui/react-components';

import { type NotificationProps } from '../types';
import {
    TOAST_NOTIFICATION_ID_APPLY_CHANGES,
    TOAST_NOTIFICATION_TIMEOUT
} from '../constants';
import { NotificationToast } from './notification-toast';
import {
    handleDiscardChanges,
    handlePersistSpecification,
    useDenebState,
    useSpecificationEditor
} from '@deneb-viz/app-core';

export const NotificationApplyChanges = ({ toasterId }: NotificationProps) => {
    const { isDirty, mode, translate } = useDenebState(
        (state) => ({
            isDirty: state.editor.isDirty,
            mode: state.interface.mode,
            translate: state.i18n.translate
        }),
        shallow
    );
    const toastId = useId(TOAST_NOTIFICATION_ID_APPLY_CHANGES);
    const { dispatchToast, dismissToast } = useToastController(toasterId);
    const { spec, config } = useSpecificationEditor();
    const handleApply = () => {
        dismissToast(toastId);
        handlePersistSpecification(spec?.current, config?.current, false);
    };
    const handleDiscard = () => {
        dismissToast(toastId);
        handleDiscardChanges();
    };
    const notify = () =>
        dispatchToast(
            <NotificationToast
                title={translate('PowerBI_Toast_Title_Unapplied_Changes')}
                body={translate('PowerBI_Toast_Body_Unapplied_Changes')}
                footer={
                    <>
                        <Link onClick={handleApply}>
                            {translate('PowerBI_Toast_Action_Apply')}
                        </Link>
                        <Link onClick={handleDiscard}>
                            {translate('PowerBI_Toast_Action_Dismiss')}
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
