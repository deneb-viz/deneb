import * as React from 'react';
import { useSelector } from 'react-redux';

import { Stack, Text } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import {
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens
} from '../../config/styles';
import { state } from '../../store';
import ExportValidation from './ExportValidation';
import ExportVisualDialogPivot from './ExportVisualDialogPivot';
import TemplateExportDatasetPane from './TemplateExportDatasetPane';
import TemplateExportInformationPane from './TemplateExportInformationPane';
import TemplateExportJsonPane from './TemplateExportJsonPane';
import { templateService } from '../../services';

export const ExportVisualDialogBody = () => {
    Debugger.log('Rendering Component: [ExportVisualDialogBody]...');
    const root = useSelector(state),
        { i18n } = root.visual,
        {
            selectedExportOperation,
            templateExportState,
            templateExportErrorMessage
        } = root.templates,
        resolveExportPivot = () => {
            switch (templateExportState) {
                case 'Editing': {
                    return <ExportVisualDialogPivot />;
                }
                default:
                    return null;
            }
        },
        resolveExportBodyContent = () => {
            switch (templateExportState) {
                case 'None': {
                    templateService.validateSpecificationForExport();
                    return '';
                }
                case 'Validating':
                    return <ExportValidation />;
                case 'Editing':
                    switch (selectedExportOperation) {
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

    return (
        <Stack
            styles={modalDialogStackStyles}
            tokens={modalDialogInnerStackTokens}
        >
            <Stack.Item shrink styles={modalDialogStackItemStyles}>
                <Text variant='small'>
                    {i18n.getDisplayName('Export_Spec_Assistive')}
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
