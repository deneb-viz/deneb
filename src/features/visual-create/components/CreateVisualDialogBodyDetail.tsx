import React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';

import { CreateVisualStateHandler } from './CreateVisualStateHandler';
import { CreateVisualTemplateNav } from './CreateVisualTemplateNav';
import {
    TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES,
    TEMPLATE_PICKER_STACK_ITEM_LIST_STYLES,
    TEMPLATE_PICKER_STACK_STYLES,
    TEMPLATE_PICKER_STACK_TOKENS
} from '../../template';
import { logRender } from '../../logging';

export const CreateVisualDialogBodyDetail: React.FC = () => {
    logRender('CreateVisualDialogBodyDetail');
    return (
        <Stack
            horizontal
            styles={TEMPLATE_PICKER_STACK_STYLES}
            tokens={TEMPLATE_PICKER_STACK_TOKENS}
        >
            <Stack.Item
                grow
                disableShrink
                styles={TEMPLATE_PICKER_STACK_ITEM_LIST_STYLES}
            >
                <>
                    <CreateVisualTemplateNav />
                </>
            </Stack.Item>
            <Stack.Item
                grow={3}
                styles={TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES}
            >
                <CreateVisualStateHandler />
            </Stack.Item>
        </Stack>
    );
};
