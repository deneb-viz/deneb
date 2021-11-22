import * as React from 'react';

import { TextField } from '@fluentui/react/lib/TextField';
import { Stack } from '@fluentui/react/lib/Stack';

import Debugger from '../../Debugger';
import { textFieldStyles } from '../../config/styles';
import DataFieldLabel, {
    IDataFieldLabelProps
} from '../elements/DataFieldLabel';

const ExportDataFieldDefinition: React.FC<IDataFieldLabelProps> = (props) => {
    Debugger.log('Rendering component: [ExportDataFieldDefinition]...');
    const { datasetField } = props;
    return (
        <Stack.Item>
            <DataFieldLabel datasetField={datasetField} />
            <TextField
                label='Name'
                underlined
                required
                placeholder={datasetField.name}
                styles={textFieldStyles}
            />
        </Stack.Item>
    );
};

export default ExportDataFieldDefinition;
