import * as React from 'react';
import { useSelector } from 'react-redux';

import { Text } from 'office-ui-fabric-react/lib/Text';
import { Stack } from 'office-ui-fabric-react/lib/Stack';

import Debugger from '../../Debugger';
import { state } from '../../store';
import {
    exportPivotAssistiveTextStyles,
    templateExportInfoStackTokens,
    templatePickerStackStyles,
    templatePickerNonShrinkingStackItemStyles
} from '../../config/styles';
import ExportDataFields from './ExportDataFields';

const TemplateExportDatasetPane: React.FC = () => {
    Debugger.log('Rendering Component: [TemplateExportDatasetPane]...');
    const root = useSelector(state),
        { i18n } = root.visual;
    return (
        <Stack
            styles={templatePickerStackStyles}
            tokens={templateExportInfoStackTokens}
        >
            <Stack.Item>
                <Text variant='small' styles={exportPivotAssistiveTextStyles}>
                    {i18n.getDisplayName('Template_Export_Dataset_Assistive')}
                </Text>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={templatePickerNonShrinkingStackItemStyles}
            >
                <ExportDataFields />
            </Stack.Item>
        </Stack>
    );
};

export default TemplateExportDatasetPane;
