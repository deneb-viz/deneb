import * as React from 'react';

import { Separator, ISeparatorStyles } from '@fluentui/react/lib/Separator';
import { StackItem, Stack } from '@fluentui/react/lib/Stack';

import { theme } from '../../api/fluent';

import StatusLayoutStackItem from './StatusLayoutStackItem';

const separatorStyles: ISeparatorStyles = {
    root: {
        width: '100%',
        selectors: {
            '::before': {
                backgroundColor: theme.palette.neutralLight
            }
        }
    },
    content: {}
};

interface IStatusHeaderSectionProps {
    icon: string;
}

export const StatusHeaderSection: React.FC<IStatusHeaderSectionProps> = (
    props
) => {
    return (
        <>
            <StatusLayoutStackItem shrink>
                <Stack horizontal>
                    <StackItem grow>{props.children}</StackItem>
                    <StackItem>
                        <div className={`visual-header-image ${props.icon}`} />
                    </StackItem>
                </Stack>
            </StatusLayoutStackItem>
            <StatusLayoutStackItem shrink>
                <Separator styles={separatorStyles} />
            </StatusLayoutStackItem>
        </>
    );
};

export default StatusHeaderSection;
