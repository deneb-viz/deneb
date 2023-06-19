import React from 'react';

import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { ExportVisualValidation } from './ExportVisualValidation';
import { ExportVisualDatasetPane } from './ExportVisualDatasetPane';
import { ExportVisualInformationPane } from './ExportVisualInformationPane';
import { ExportVisualJsonPane } from './ExportVisualJsonPane';
import { i18nValue } from '../../../core/ui/i18n';
import { logRender } from '../../logging';
import {
    MODAL_DIALOG_STACK_INNER_TOKENS,
    MODAL_DIALOG_STACK_ITEM_STYLES,
    MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES,
    MODAL_DIALOG_STACK_STYLES
} from '../../modal-dialog';
import { TExportOperation, TTemplateExportState } from '../../template/types';
import { TemplateDialogPivot } from '../../template/components/TemplateDialogPivot';
import { validateSpecificationForExport } from '../logic';

/**
 * Ensure correct content is displayed in the body, based on store state.
 */
const resolveExportBodyContent = (
    state: TTemplateExportState,
    operation: TExportOperation,
    error: string
) => {
    switch (state) {
        case 'None': {
            validateSpecificationForExport();
            return '';
        }
        case 'Validating':
            return <ExportVisualValidation />;
        case 'Editing':
            switch (operation) {
                case 'information':
                    return <ExportVisualInformationPane />;
                case 'dataset':
                    return <ExportVisualDatasetPane />;
                case 'template':
                    return <ExportVisualJsonPane />;
                default:
                    return null;
            }

        case 'Error':
            return <p>Error: {error}</p>;
        default:
            return <p>{state}</p>;
    }
};

/**
 * Ensure that the pivot options are only displayed when editing.
 */
const resolveExportPivot = (state: TTemplateExportState) => {
    switch (state) {
        case 'Editing': {
            return <TemplateDialogPivot type='export' />;
        }
        default:
            return null;
    }
};

export const ExportVisualDialogBody: React.FC = () => {
    const {
        templateExportState,
        templateExportErrorMessage,
        templateSelectedExportOperation
    } = store(
        (state) => ({
            templateExportState: state.templateExportState,
            templateExportErrorMessage: state.templateExportErrorMessage,
            templateSelectedExportOperation:
                state.templateSelectedExportOperation
        }),
        shallow
    );
    logRender('ExportVisualDialogBody');
    return (
        <Stack
            styles={MODAL_DIALOG_STACK_STYLES}
            tokens={MODAL_DIALOG_STACK_INNER_TOKENS}
        >
            <Stack.Item shrink styles={MODAL_DIALOG_STACK_ITEM_STYLES}>
                <Text variant='small'>
                    {i18nValue('Export_Spec_Assistive')}
                </Text>
            </Stack.Item>
            <Stack.Item shrink styles={MODAL_DIALOG_STACK_ITEM_STYLES}>
                <div className='editor-pane-pivot'>
                    {resolveExportPivot(templateExportState)}
                </div>
            </Stack.Item>
            <Stack.Item
                verticalFill
                styles={MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES}
            >
                <div className='export-spec-container'>
                    {resolveExportBodyContent(
                        templateExportState,
                        templateSelectedExportOperation,
                        templateExportErrorMessage
                    )}
                </div>
            </Stack.Item>
        </Stack>
    );
};
