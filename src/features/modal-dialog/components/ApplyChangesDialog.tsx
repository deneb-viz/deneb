import React from 'react';

import { Dialog, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';

import { discardChanges } from '../../../core/ui/commands';
import { buttonStyles } from '../../../core/ui/fluent';
import store from '../../../store';
import { MODAL_DIALOG_PROPS } from '../styles';
import { persistSpecification } from '../../specification';
import { shallow } from 'zustand/shallow';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

/**
 * Populate suitable `IDialogContentProps` based on supplied i18n keys.
 */
const getDialogContentProps = (
    titleKey: string,
    subTextKey: string
): IDialogContentProps => {
    return {
        type: DialogType.normal,
        title: getI18nValue(titleKey),
        subText: getI18nValue(subTextKey),
        showCloseButton: false
    };
};

export const ApplyChangesDialog: React.FC = () => {
    const { isDirty, visualMode } = store(
        (state) => ({
            isDirty: state.editor.isDirty,
            visualMode: state.visualMode
        }),
        shallow
    );
    const hidden = !(isDirty && visualMode === 'Standard');
    const handleApply = () => persistSpecification(false);
    const handleDiscard = () => discardChanges();
    const dialogContentProps = getDialogContentProps(
        'Dialog_Unapplied_Changes_Title',
        'Dialog_Unapplied_Changes_Subtext'
    );
    const applyText = getI18nValue('Dialog_Unapplied_Changes_Apply');
    const discardText = getI18nValue('Dialog_Unapplied_Changes_Discard');
    logRender('ApplyDialog');
    return (
        <>
            <Dialog
                hidden={hidden}
                onDismiss={handleDiscard}
                dialogContentProps={dialogContentProps}
                modalProps={MODAL_DIALOG_PROPS}
            >
                <DialogFooter>
                    <PrimaryButton
                        onClick={handleApply}
                        text={applyText}
                        styles={buttonStyles}
                    />
                    <DefaultButton
                        onClick={handleDiscard}
                        text={discardText}
                        styles={buttonStyles}
                    />
                </DialogFooter>
            </Dialog>
        </>
    );
};
