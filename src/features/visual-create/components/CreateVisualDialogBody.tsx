import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { CreateVisualDialogBodyDetail } from './CreateVisualDialogBodyDetail';

import { i18nValue } from '../../../core/ui/i18n';
import { buttonStyles } from '../../../core/ui/fluent';
import {
    MODAL_DIALOG_STACK_INNER_TOKENS,
    MODAL_DIALOG_STACK_ITEM_STYLES,
    MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES,
    MODAL_DIALOG_STACK_STYLES
} from '../../modal-dialog';
import { TemplateDialogPivot } from '../../template/components/TemplateDialogPivot';
import { createFromTemplate } from '../logic';
import { logRender } from '../../logging';

export const CreateVisualDialogBody: React.FC = () => {
    const {
        templateAllImportCriteriaApplied,
        templateSpecProvider,
        templateToApply
    } = store(
        (state) => ({
            templateAllImportCriteriaApplied:
                state.templateAllImportCriteriaApplied,
            templateSpecProvider: state.templateSpecProvider,
            templateToApply: state.templateToApply
        }),
        shallow
    );
    const handleCreate = () => {
            createFromTemplate(templateSpecProvider, templateToApply);
        },
        createDisabled = !templateAllImportCriteriaApplied;
    logRender('CreateVisualDialogBody');
    return (
        <Stack
            styles={MODAL_DIALOG_STACK_STYLES}
            tokens={MODAL_DIALOG_STACK_INNER_TOKENS}
        >
            <Stack.Item shrink styles={MODAL_DIALOG_STACK_ITEM_STYLES}>
                <Text variant='small'>{i18nValue('New_Spec_Assistive')}</Text>
            </Stack.Item>
            <Stack.Item shrink styles={MODAL_DIALOG_STACK_ITEM_STYLES}>
                <div className='editor-pane-pivot'>
                    <TemplateDialogPivot type='new' />
                </div>
            </Stack.Item>
            <Stack.Item
                verticalFill
                styles={MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES}
            >
                <div className='new-spec-container'>
                    <CreateVisualDialogBodyDetail />
                </div>
            </Stack.Item>
            <Stack.Item
                shrink
                styles={MODAL_DIALOG_STACK_ITEM_STYLES}
                align='end'
            >
                <PrimaryButton
                    styles={buttonStyles}
                    onClick={handleCreate}
                    text={i18nValue('Button_Create')}
                    disabled={createDisabled}
                />
            </Stack.Item>
        </Stack>
    );
};
