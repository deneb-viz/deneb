import { useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { Link, useId, useToastController } from '@fluentui/react-components';

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { type NotificationProps } from '../types';
import { useDenebState } from '../../../state';
import {
    TOAST_NOTIFICATION_ID_APPLY_CHANGES,
    TOAST_NOTIFICATION_TIMEOUT
} from '../constants';
import { useSpecificationEditor } from '../../specification-editor';
import { NotificationToast } from './notification-toast';
import { handleDiscardChanges, handlePersistSpecification } from '../../../lib';

export const NotificationApplyChanges = ({ toasterId }: NotificationProps) => {
    const { isDirty, mode } = useDenebState(
        (state) => ({
            isDirty: state.editor.isDirty,
            mode: state.interface.mode
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
                title={getI18nValue('Text_Toast_Title_Unapplied_Changes')}
                body={getI18nValue('Text_Toast_Body_Unapplied_Changes')}
                footer={
                    <>
                        <Link onClick={handleApply}>
                            {getI18nValue('Text_Toast_Action_Apply')}
                        </Link>
                        <Link onClick={handleDiscard}>
                            {getI18nValue('Text_Toast_Action_Dismiss')}
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
