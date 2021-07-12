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
} from '../../config/styles';
import { state } from '../../store';
import NewVisualDialogPivot from './NewVisualDialogPivot';
import TemplateManagementPane from './TemplateManagementPane';
import { createFromTemplate } from '../../api/specification';
import { fluent } from '../../api';
import { getHostLM } from '../../api/i18n';

export const NewVisualDialogBody = () => {
    const root = useSelector(state),
        i18n = getHostLM(),
        {
            allImportCriteriaApplied,
            specProvider,
            templateToApply
        } = root.templates,
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
                <Text variant='small'>
                    {i18n.getDisplayName('New_Spec_Assistive')}
                </Text>
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
                    styles={fluent.buttonStyles}
                    onClick={handleCreate}
                    text={i18n.getDisplayName('Button_Create')}
                    disabled={createDisabled}
                />
            </Stack.Item>
        </Stack>
    );
};

export default NewVisualDialogBody;
