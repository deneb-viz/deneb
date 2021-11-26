import * as React from 'react';

import { IconButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { theme } from '../../core/ui/fluent';

interface IFieldInfoIconProps {
    description: string;
}

const templateTypeInfoIconStyles: IButtonStyles = {
    icon: { color: theme.palette.neutralTertiary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark }
};

const FieldInfoIcon: React.FC<IFieldInfoIconProps> = (props) => {
    return (
        props.description &&
        ((
            <IconButton
                aria-label={props.description}
                iconProps={{
                    iconName: 'Info'
                }}
                styles={templateTypeInfoIconStyles}
                title={props.description}
            />
        ) || <></>)
    );
};

export default FieldInfoIcon;
