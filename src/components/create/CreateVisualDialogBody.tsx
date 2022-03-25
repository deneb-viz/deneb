import React from 'react';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrimaryButton } from '@fluentui/react/lib/Button';

import {
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens
} from '../../core/ui/modal';
import { useStoreProp } from '../../store';
import CreateVisualDialogPivot from './CreateVisualDialogPivot';
import CreateVisualPaneContent from './CreateVisualPaneContent';
import { createFromTemplate } from '../../core/utils/specification';
import { i18nValue } from '../../core/ui/i18n';
import { buttonStyles } from '../../core/ui/fluent';
import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { TSpecProvider } from '../../core/vega';

export const CreateVisualDialogBody = () => {
    const templateAllImportCriteriaApplied: boolean = useStoreProp(
        'templateAllImportCriteriaApplied'
    );
    const templateSpecProvider: TSpecProvider = useStoreProp(
        'templateSpecProvider'
    );
    const templateToApply: Spec | TopLevelSpec =
        useStoreProp('templateToApply');
    const handleCreate = () => {
            createFromTemplate(templateSpecProvider, templateToApply);
        },
        createDisabled = !templateAllImportCriteriaApplied;

    return (
        <Stack
            styles={modalDialogStackStyles}
            tokens={modalDialogInnerStackTokens}
        >
            <Stack.Item shrink styles={modalDialogStackItemStyles}>
                <Text variant='small'>{i18nValue('New_Spec_Assistive')}</Text>
            </Stack.Item>
            <Stack.Item shrink styles={modalDialogStackItemStyles}>
                <div className='editor-pane-pivot'>
                    <CreateVisualDialogPivot />
                </div>
            </Stack.Item>
            <Stack.Item verticalFill styles={modalDialogStackItemWrapperStyles}>
                <div className='new-spec-container'>
                    <CreateVisualPaneContent />
                </div>
            </Stack.Item>
            <Stack.Item shrink styles={modalDialogStackItemStyles} align='end'>
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

export default CreateVisualDialogBody;
