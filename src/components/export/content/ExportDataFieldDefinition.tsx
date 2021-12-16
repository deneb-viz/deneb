import * as React from 'react';

import { TextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { Stack } from '@fluentui/react/lib/Stack';

import DataFieldLabel, {
    IDataFieldLabelProps
} from '../../elements/DataFieldLabel';

const textFieldStyles: Partial<ITextFieldStyles> = {
    root: {
        marginLeft: 35,
        width: 300
    }
};

const ExportDataFieldDefinition: React.FC<IDataFieldLabelProps> = (props) => {
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
