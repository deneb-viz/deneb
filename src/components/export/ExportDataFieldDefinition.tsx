import * as React from 'react';

import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Stack } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { IDataFieldLabelProps } from '../../types';
import { textFieldStyles } from '../../config/styles';
import DataFieldLabel from '../elements/DataFieldLabel';

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
