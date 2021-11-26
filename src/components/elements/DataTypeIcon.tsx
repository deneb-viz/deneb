import * as React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';

import { ITemplateDatasetField } from '../../core/template/schema';
import { getDataTypeIcon } from '../../core/ui/icons';
import { getDataTypeIconTitle } from '../../core/ui/labels';
import { templateTypeIconStyles } from '../../core/ui/fluent';

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
