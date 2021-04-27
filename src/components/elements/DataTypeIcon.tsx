import * as React from 'react';

import { IconButton, Label, Stack } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { templateService } from '../../services';
import { IDataFieldLabelProps } from '../../types';
import { templateTypeIconStyles } from '../../config/styles';

const DataTypeIcon: React.FC<IDataFieldLabelProps> = (props) => {
    const { datasetField } = props;
    Debugger.log('Rendering component: [DataTypeIcon]...');
    return (
        <IconButton
            iconProps={{
                iconName: templateService.resolveTypeIcon(datasetField.type)
            }}
            title={templateService.resolveTypeIconTitle(datasetField.type)}
            ariaLabel={templateService.resolveTypeIconTitle(datasetField.type)}
            styles={templateTypeIconStyles}
        />
    );
};

export default DataTypeIcon;
