import * as React from 'react';

import { Label } from '@fluentui/react/lib/Label';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import { choiceStackTokens } from '../../config/styles';
import TooltipCheckbox from './TooltipCheckbox';
import SelectionCheckbox from './SelectionCheckbox';
import ContextMenuCheckbox from './ContextMenuCheckbox';
import { i18nValue } from '../../core/ui/i18n';

const InteractivitySettings = () => (
    <>
        <Label>{i18nValue('Objects_Vega_Interactivity')}</Label>
        <Stack tokens={choiceStackTokens}>
            <TooltipCheckbox />
            <ContextMenuCheckbox />
            <SelectionCheckbox />
        </Stack>
        <Text variant='smallPlus'>
            {i18nValue('Assistive_Text_Interactivity')}
        </Text>
    </>
);

export default InteractivitySettings;
