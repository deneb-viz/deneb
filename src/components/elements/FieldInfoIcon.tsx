import * as React from 'react';

import { IconButton } from '@fluentui/react/lib/Button';

import { templateTypeInfoIconStyles } from '../../config/styles';

interface IFieldInfoIconProps {
    description: string;
}

const FieldInfoIcon: React.FC<IFieldInfoIconProps> = (props) => {
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
