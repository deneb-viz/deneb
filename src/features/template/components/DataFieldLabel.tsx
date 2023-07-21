import * as React from 'react';

import { Text } from '@fluentui/react/lib/Text';
import { Stack, IStackStyles } from '@fluentui/react/lib/Stack';

import { ITemplateDatasetField } from '..';

export interface IDataFieldLabelProps {
    datasetField: ITemplateDatasetField;
}

const stackStyles: IStackStyles = {
    root: {
        minHeight: 32
    }
};

const DataFieldLabel: React.FC<IDataFieldLabelProps> = (props) => {
    const { datasetField } = props;
    return (
        <Stack horizontal verticalAlign='center' styles={stackStyles}>
            <Text>{datasetField.name}</Text>{' '}
        </Stack>
    );
};

export default DataFieldLabel;
