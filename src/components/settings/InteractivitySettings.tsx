import * as React from 'react';
import { useSelector } from 'react-redux';

import { Label } from '@fluentui/react/lib/Label';
import { Stack, IStackTokens } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import TooltipCheckbox from './TooltipCheckbox';
import SelectionCheckbox from './SelectionCheckbox';
import ContextMenuCheckbox from './ContextMenuCheckbox';
import SelectionMaxDataPoints from './SelectionMaxDataPoints';
import { i18nValue } from '../../core/ui/i18n';
import { state } from '../../store';

const stackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

const InteractivitySettings = () => {
    const { enableSelection } = useSelector(state).visual.settings.vega;
    return (
        <>
            <Label>{i18nValue('Objects_Vega_Interactivity')}</Label>
            <Stack tokens={stackTokens}>
                <TooltipCheckbox />
                <ContextMenuCheckbox />
                <SelectionCheckbox />
            </Stack>
            <Text variant='smallPlus'>
                {i18nValue('Assistive_Text_Interactivity')}
            </Text>
            {(enableSelection && (
                <>
                    <Stack tokens={stackTokens}>
                        <SelectionMaxDataPoints />
                    </Stack>
                    <Text variant='smallPlus'>
                        {i18nValue(
                            'Objects_Vega_SelectionMaxDataPoints_Description'
                        )}
                    </Text>
                </>
            )) || <></>}
        </>
    );
};

export default InteractivitySettings;
