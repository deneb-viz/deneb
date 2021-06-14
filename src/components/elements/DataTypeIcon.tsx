import * as React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';

import Debugger from '../../Debugger';
import { IDataFieldLabelProps } from '../../types';
import { templateTypeIconStyles } from '../../config/styles';
import { resolveTypeIcon, resolveTypeIconTitle } from '../../api/template';

const DataTypeIcon: React.FC<IDataFieldLabelProps> = (props) => {
    const { datasetField } = props;
    Debugger.log('Rendering component: [DataTypeIcon]...');
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
