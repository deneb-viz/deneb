import React from 'react';

import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';

import { useStoreProp } from '../../../store';
import ExportValidation from '../../../components/export/content/ExportValidation';
import ExportVisualDialogPivot from '../../../components/export/ExportVisualDialogPivot';
import TemplateExportDatasetPane from '../../../components/export/content/TemplateExportDatasetPane';
import TemplateExportInformationPane from '../../../components/export/content/TemplateExportInformationPane';
import TemplateExportJsonPane from '../../../components/export/content/TemplateExportJsonPane';
import {
    TExportOperation,
    TTemplateExportState,
    validateSpecificationForExport
} from '../../../core/template';
import { i18nValue } from '../../../core/ui/i18n';
import { reactLog } from '../../../core/utils/reactLog';
import {
    MODAL_DIALOG_STACK_INNER_TOKENS,
    MODAL_DIALOG_STACK_ITEM_STYLES,
    MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES,
    MODAL_DIALOG_STACK_STYLES
} from '../../modal-dialog';

export const ExportVisualDialogBody: React.FC = () => {
    const templateSelectedExportOperation: TExportOperation = useStoreProp(
        'templateSelectedExportOperation'
    );
    const templateExportState: TTemplateExportState = useStoreProp(
        'templateExportState'
    );
    const templateExportErrorMessage: string = useStoreProp(
        'templateExportErrorMessage'
    );
    const resolveExportPivot = () => {
        switch (templateExportState) {
            case 'Editing': {
                return <ExportVisualDialogPivot />;
            }
            default:
                return null;
        }
    };
    const resolveExportBodyContent = () => {
        switch (templateExportState) {
            case 'None': {
                validateSpecificationForExport();
                return '';
            }
            case 'Validating':
                return <ExportValidation />;
            case 'Editing':
                switch (templateSelectedExportOperation) {
                    case 'information':
                        return <TemplateExportInformationPane />;
                    case 'dataset':
                        return <TemplateExportDatasetPane />;
                    case 'template':
                        return <TemplateExportJsonPane />;
                    default:
                        return null;
                }

            case 'Error':
                return <p>Error: {templateExportErrorMessage}</p>;
            default:
                return <p>{templateExportState}</p>;
        }
    };
    reactLog('Rendering [ExportVisualDialogBody]');
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
                <div className='editor-pane-pivot'>{resolveExportPivot()}</div>
            </Stack.Item>
            <Stack.Item
                verticalFill
                styles={MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES}
            >
                <div className='export-spec-container'>
                    {resolveExportBodyContent()}
                </div>
            </Stack.Item>
        </Stack>
    );
};
