import * as React from 'react';

import { Label } from '@fluentui/react/lib/Label';
import { Stack } from '@fluentui/react/lib/Stack';

import DataTypeIcon from './DataTypeIcon';
import FieldInfoIcon from './FieldInfoIcon';
import { ITemplateDatasetField } from '../../core/template/schema';

interface IDataFieldLabelProps {
    datasetField: ITemplateDatasetField;
}

const DataFieldLabel: React.FC<IDataFieldLabelProps> = (props) => {
    const { datasetField } = props;
    return (
        <Stack horizontal verticalAlign='center'>
            <DataTypeIcon datasetField={datasetField} />
            <Label>{datasetField.name}</Label>{' '}
            <FieldInfoIcon description={datasetField.description} />
        </Stack>
    );
};

export default DataFieldLabel;
