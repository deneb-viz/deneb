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
    specificationEditorRefs,
    useDenebState
} from '@deneb-viz/app-core';

export const NotificationApplyChanges = ({ toasterId }: NotificationProps) => {
    const { isDirty, type, translate } = useDenebState(
        (state) => ({
            isDirty: state.editor.isDirty,
            type: state.interface.type,
            translate: state.i18n.translate
        }),
        shallow
    );
    const toastId = useId(TOAST_NOTIFICATION_ID_APPLY_CHANGES);
    const { dispatchToast, dismissToast } = useToastController(toasterId);
    // Use the module-level singleton refs directly rather than
    // `useSpecificationEditor()`. This component is mounted on the App
    // shell (sibling of `RetainedDenebEditor`), so the
    // `SpecificationEditorProvider` is not in its ancestor chain on a
    // cold viewer load — calling the hook would (correctly) throw and
    // unmount the entire App. The refs are module-level singletons
    // populated by the Monaco instances when the editor mounts;
    // reading their `.current` lazily inside the click handlers
    // gracefully no-ops before the editor has ever been opened
    // (matching the prior behaviour when the context was wrongly
    // defaulted to a truthy sentinel).
    const { spec, config } = specificationEditorRefs;
    const handleApply = () => {
        dismissToast(toastId);
        handlePersistSpecification(spec.current, config.current, false);
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
        if (isDirty && type === 'viewer') {
            notify();
        } else {
            dismissToast(toastId);
        }
    }, [isDirty, type]);
    return <></>;
};
