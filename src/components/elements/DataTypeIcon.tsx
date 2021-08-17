import * as React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';

import { templateTypeIconStyles } from '../../config/styles';

import { ITemplateDatasetField } from '../../core/template/schema';
import { getDataTypeIcon } from '../../core/ui/icons';
import { getDataTypeIconTitle } from '../../core/ui/labels';

interface IDataTypeIconProps {
    datasetField: ITemplateDatasetField;
}

const DataTypeIcon: React.FC<IDataTypeIconProps> = (props) => {
    const { datasetField } = props;
    return (
        <IconButton
            iconProps={{
                iconName: getDataTypeIcon(datasetField.type)
            }}
            title={getDataTypeIconTitle(datasetField.type)}
            ariaLabel={getDataTypeIconTitle(datasetField.type)}
            styles={templateTypeIconStyles}
        />
    );
};

export default DataTypeIcon;
