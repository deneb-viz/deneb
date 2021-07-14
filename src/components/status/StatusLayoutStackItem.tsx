import * as React from 'react';

import {
    StackItem,
    IStackItemStyles,
    IStackItemProps
} from '@fluentui/react/lib/Stack';

const stackItemStyles: IStackItemStyles = {
    root: {
        display: 'block',
        height: 'auto'
    }
};

const StatusLayoutStackItem: React.FC<IStackItemProps> = (
    props: IStackItemProps
) => {
    return (
        <>
            <StackItem {...props} styles={stackItemStyles}>
                {props.children}
            </StackItem>
        </>
    );
};

export default StatusLayoutStackItem;
