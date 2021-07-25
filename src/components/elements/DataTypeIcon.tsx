import * as React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';

import { templateTypeIconStyles } from '../../config/styles';
import { resolveTypeIcon, resolveTypeIconTitle } from '../../api/template';

import { ITemplateDatasetField } from '../../schema/template-v1';

interface IDataTypeIconProps {
    datasetField: ITemplateDatasetField;
}

const DataTypeIcon: React.FC<IDataTypeIconProps> = (props) => {
    const { datasetField } = props;
    return (
        <IconButton
            iconProps={{
                iconName: resolveTypeIcon(datasetField.type)
            }}
            title={resolveTypeIconTitle(datasetField.type)}
            ariaLabel={resolveTypeIconTitle(datasetField.type)}
            styles={templateTypeIconStyles}
        />
    );
};

export default DataTypeIcon;
