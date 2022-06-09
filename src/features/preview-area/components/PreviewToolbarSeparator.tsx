import React from 'react';
import { Separator, ISeparatorStyles } from '@fluentui/react/lib/Separator';
import { StackItem } from '@fluentui/react/lib/Stack';

import { theme } from '../../../core/ui/fluent';

const separatorStyles: Partial<ISeparatorStyles> = {
    root: {
        '&::after': {
            backgroundColor: theme.palette.neutralLight
        }
    }
};

export const PreviewToolbarSeparator: React.FC = () => {
    return (
        <StackItem shrink>
            <Separator vertical styles={separatorStyles} />
        </StackItem>
    );
};
