import React from 'react';

import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';

import {
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens
} from '../../core/ui/modal';
import { useStoreProp } from '../../store';
import ExportValidation from './content/ExportValidation';
import ExportVisualDialogPivot from './ExportVisualDialogPivot';
import TemplateExportDatasetPane from './content/TemplateExportDatasetPane';
import TemplateExportInformationPane from './content/TemplateExportInformationPane';
import TemplateExportJsonPane from './content/TemplateExportJsonPane';
import {
    TExportOperation,
    TTemplateExportState,
    validateSpecificationForExport
} from '../../core/template';
import { i18nValue } from '../../core/ui/i18n';
import { reactLog } from '../../core/utils/reactLog';

export const ExportVisualDialogBody = () => {
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
            styles={modalDialogStackStyles}
            tokens={modalDialogInnerStackTokens}
        >
            <Stack.Item shrink styles={modalDialogStackItemStyles}>
                <Text variant='small'>
                    {i18nValue('Export_Spec_Assistive')}
                </Text>
            </Stack.Item>
            <Stack.Item shrink styles={modalDialogStackItemStyles}>
                <div className='editor-pane-pivot'>{resolveExportPivot()}</div>
            </Stack.Item>
            <Stack.Item verticalFill styles={modalDialogStackItemWrapperStyles}>
                <div className='export-spec-container'>
                    {resolveExportBodyContent()}
                </div>
            </Stack.Item>
        </Stack>
    );
};

export default ExportVisualDialogBody;
