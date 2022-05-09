import React from 'react';

import { Dialog, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';

import { discardChanges } from '../../../core/ui/commands';
import { i18nValue } from '../../../core/ui/i18n';
import { buttonStyles } from '../../../core/ui/fluent';
import { useStoreProp } from '../../../store';
import { TVisualMode } from '../../../core/ui';
import { reactLog } from '../../../core/utils/reactLog';
import { MODAL_DIALOG_PROPS } from '../styles';
import { persistSpecification } from '../../specification';

/**
 * Populate suitable `IDialogContentProps` based on supplied i18n keys.
 */
const getDialogContentProps = (
    titleKey: string,
    subTextKey: string
): IDialogContentProps => {
    return {
        type: DialogType.normal,
        title: i18nValue(titleKey),
        subText: i18nValue(subTextKey),
        showCloseButton: false
    };
};

export const ApplyChangesDialog: React.FC = () => {
    const editorIsDirty: boolean = useStoreProp('editorIsDirty');
    const visualMode: TVisualMode = useStoreProp('visualMode');
    const hidden = !(editorIsDirty && visualMode === 'Standard');
    const handleApply = () => persistSpecification(false);
    const handleDiscard = () => discardChanges();
    const dialogContentProps = getDialogContentProps(
        'Dialog_Unapplied_Changes_Title',
        'Dialog_Unapplied_Changes_Subtext'
    );
    const applyText = i18nValue('Dialog_Unapplied_Changes_Apply');
    const discardText = i18nValue('Dialog_Unapplied_Changes_Discard');
    reactLog('Rendering [ApplyDialog]');
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
