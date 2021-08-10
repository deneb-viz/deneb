import * as React from 'react';
import { useSelector } from 'react-redux';

import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrimaryButton } from '@fluentui/react/lib/Button';

import {
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens
} from '../../core/ui/modal';
import { state } from '../../store';
import NewVisualDialogPivot from './NewVisualDialogPivot';
import TemplateManagementPane from './TemplateManagementPane';
import { createFromTemplate } from '../../core/utils/specification';
import { i18nValue } from '../../core/ui/i18n';
import { buttonStyles } from '../../core/ui/fluent';

export const NewVisualDialogBody = () => {
    const root = useSelector(state),
        { allImportCriteriaApplied, specProvider, templateToApply } =
            root.templates,
        handleCreate = () => {
            createFromTemplate(specProvider, templateToApply);
        },
        createDisabled = !allImportCriteriaApplied;

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
                    <NewVisualDialogPivot />
                </div>
            </Stack.Item>
            <Stack.Item verticalFill styles={modalDialogStackItemWrapperStyles}>
                <div className='new-spec-container'>
                    <TemplateManagementPane />
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

export default NewVisualDialogBody;
