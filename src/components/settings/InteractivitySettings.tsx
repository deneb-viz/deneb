import * as React from 'react';

import { Label } from '@fluentui/react/lib/Label';
import { Link } from '@fluentui/react/lib/Link';
import { Stack, IStackTokens } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import TooltipCheckbox from './TooltipCheckbox';
import SelectionCheckbox from './SelectionCheckbox';
import ContextMenuCheckbox from './ContextMenuCheckbox';
import SelectionMaxDataPoints from './SelectionMaxDataPoints';
import { i18nValue } from '../../core/ui/i18n';
import store from '../../store';
import { linkStyles } from '../../core/ui/fluent';
import { hostServices } from '../../core/services';
import { getConfig } from '../../core/utils/config';

const stackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

const InteractivitySettings = () => {
    const { enableSelection } = store((state) => state.visualSettings.vega),
        { providerResources } = getConfig(),
        openInteractivityLink = () => {
            hostServices.launchUrl(
                providerResources.deneb.interactivityDocumentationUrl
            );
        };
    return (
        <>
            <Label>{i18nValue('Objects_Vega_Interactivity')}</Label>
            <Stack tokens={stackTokens}>
                <TooltipCheckbox />
                <ContextMenuCheckbox />
                <SelectionCheckbox />
            </Stack>
            <Text variant='smallPlus'>
                {i18nValue('Assistive_Text_Interactivity')}{' '}
                <Link styles={linkStyles} onClick={openInteractivityLink}>
                    {i18nValue('Link_Interactivity_Doc')}
                </Link>
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
