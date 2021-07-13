import * as React from 'react';

import { Dialog, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';

import { applyChanges, discardChanges } from '../../api/commands';
import { fluent } from '../../api/';
import { isApplyDialogHidden } from '../../api/ui';
import { i18nValue } from '../../core/ui/i18n';

export const ApplyDialog: React.FunctionComponent = () => {
    const hidden = isApplyDialogHidden(),
        handleApply = () => applyChanges(),
        handleDiscard = () => discardChanges(),
        dialogContentProps = fluent.getDialogContentProps(
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
                modalProps={fluent.dialogPropsStyles}
            >
                <DialogFooter>
                    <PrimaryButton
                        onClick={handleApply}
                        text={applyText}
                        styles={fluent.buttonStyles}
                    />
                    <DefaultButton
                        onClick={handleDiscard}
                        text={discardText}
                        styles={fluent.buttonStyles}
                    />
                </DialogFooter>
            </Dialog>
        </>
    );
};

export default ApplyDialog;
