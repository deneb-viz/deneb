import * as React from 'react';

import { Label, Stack } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { IDataFieldLabelProps } from '../../types';
import DataTypeIcon from './DataTypeIcon';
import FieldInfoIcon from './FieldInfoIcon';

const DataFieldLabel: React.FC<IDataFieldLabelProps> = (props) => {
    const { datasetField } = props;
    Debugger.log('Rendering component: [DataFieldLabel]...');
    return (
        <Stack horizontal verticalAlign='center'>
            <DataTypeIcon datasetField={datasetField} />
            <Label>{datasetField.name}</Label>{' '}
            <FieldInfoIcon description={datasetField.description} />
        </Stack>
    );
};

export default DataFieldLabel;
