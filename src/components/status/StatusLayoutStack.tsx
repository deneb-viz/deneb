import * as React from 'react';

import { Stack, IStackTokens, IStackStyles } from '@fluentui/react/lib/Stack';

const verticalStackOuterStyles: IStackStyles = {
    root: {
        height: '100vh'
    }
};

const verticalStackInnerStyles: IStackStyles = {
    root: {
        height: '100%',
        width: '100%'
    }
};

const verticalStackOuterTokens: IStackTokens = {
    padding: 1
};

const verticalStackInnerTokens: IStackTokens = {
    childrenGap: 5,
    padding: 10
};

const StatusLayoutStack: React.FC = (props) => {
    return (
        <>
            <Stack
                styles={verticalStackOuterStyles}
                tokens={verticalStackOuterTokens}
            >
                <Stack
                    styles={verticalStackInnerStyles}
                    tokens={verticalStackInnerTokens}
                >
                    {props.children}
                </Stack>
            </Stack>
        </>
    );
};

export default StatusLayoutStack;
