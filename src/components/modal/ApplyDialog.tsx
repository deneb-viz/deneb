import * as React from 'react';

import { Dialog, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';

import { discardChanges } from '../../core/ui/commands';
import {
    getDialogContentProps,
    isApplyDialogHidden,
    modalDialogPropsStyles
} from '../../core/ui/modal';
import { i18nValue } from '../../core/ui/i18n';
import { buttonStyles } from '../../core/ui/fluent';
import { persist } from '../../core/utils/specification';

export const ApplyDialog: React.FunctionComponent = () => {
    const hidden = isApplyDialogHidden(),
        handleApply = () => persist(false),
        handleDiscard = () => discardChanges(),
        dialogContentProps = getDialogContentProps(
            'Dialog_Unapplied_Changes_Title',
            'Dialog_Unapplied_Changes_Subtext'
        ),
        applyText = i18nValue('Dialog_Unapplied_Changes_Apply'),
        discardText = i18nValue('Dialog_Unapplied_Changes_Discard');

    return (
        <>
            <Dialog
                hidden={hidden}
                onDismiss={handleDiscard}
                dialogContentProps={dialogContentProps}
                modalProps={modalDialogPropsStyles}
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

export default ApplyDialog;
