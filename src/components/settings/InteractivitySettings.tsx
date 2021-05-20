import * as React from 'react';
import { useSelector } from 'react-redux';
import { Label } from '@fluentui/react/lib/Label';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import Debugger from '../../Debugger';
import { choiceStackTokens } from '../../config/styles';
import { state } from '../../store';
import TooltipCheckbox from './TooltipCheckbox';
import SelectionCheckbox from './SelectionCheckbox';
import ContextMenuCheckbox from './ContextMenuCheckbox';

const InteractivitySettings = () => {
    Debugger.log('Rendering Component: [InteractivitySettings]...');
    const { i18n } = useSelector(state).visual;
    return (
        <>
            <Label>{i18n.getDisplayName('Objects_Vega_Interactivity')}</Label>
            <Stack tokens={choiceStackTokens}>
                <TooltipCheckbox />
                <ContextMenuCheckbox />
                <SelectionCheckbox />
            </Stack>
            <Text variant='smallPlus'>
                {i18n.getDisplayName('Assistive_Text_Interactivity')}
            </Text>
        </>
    );
};

export default InteractivitySettings;
