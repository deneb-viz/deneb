import React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';

import { CreateVisualStateHandler } from './CreateVisualStateHandler';
import { CreateVisualTemplateNav } from './CreateVisualTemplateNav';
import { reactLog } from '../../../core/utils/reactLog';
import {
    TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES,
    TEMPLATE_PICKER_STACK_ITEM_LIST_STYLES,
    TEMPLATE_PICKER_STACK_STYLES,
    TEMPLATE_PICKER_STACK_TOKENS
} from '../../template';

export const CreateVisualDialogBodyDetail: React.FC = () => {
    reactLog('Rendering [CreateVisualDialogBodyDetail]');
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
