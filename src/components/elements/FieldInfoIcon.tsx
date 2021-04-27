import * as React from 'react';

import { IconButton } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import { IFieldInfoIconProps } from '../../types';
import { templateTypeInfoIconStyles } from '../../config/styles';

const FieldInfoIcon: React.FC<IFieldInfoIconProps> = (props) => {
    Debugger.log('Rendering component: [FieldInfoIcon]...');
    return (
        props.description &&
        ((
            <IconButton
                iconProps={{
                    iconName: 'Info'
                }}
                styles={templateTypeInfoIconStyles}
                title={props.description}
                ariaLabel={props.description}
            />
        ) || <></>)
    );
};

export default FieldInfoIcon;
