import React from 'react';

import { Label } from '@fluentui/react/lib/Label';
import { Link } from '@fluentui/react/lib/Link';
import { Stack, IStackTokens } from '@fluentui/react/lib/Stack';

import { InteractivityCheckbox } from './InteractivityCheckbox';
import { SelectionMaxDataPoints } from './SelectionMaxDataPoints';
import store from '../../../store';
import { linkStyles } from '../../../core/ui/fluent';
import { hostServices } from '../../../core/services';
import { getConfig } from '../../../core/utils/config';
import { Paragraph } from '../../../components/elements/Typography';
import { getI18nValue } from '../../i18n';

const stackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

export const InteractivitySettings = () => {
    const { enableSelection } = store((state) => state.visualSettings.vega),
        { providerResources } = getConfig(),
        openInteractivityLink = () => {
            hostServices.launchUrl(
                providerResources.deneb.interactivityDocumentationUrl
            );
        };
    return (
        <>
            <Label>{getI18nValue('Objects_Vega_Interactivity')}</Label>
            <Stack tokens={stackTokens}>
                <InteractivityCheckbox type='tooltip' />
                <InteractivityCheckbox type='context' />
                <InteractivityCheckbox type='highlight' />
                <InteractivityCheckbox type='select' />
            </Stack>
            <Paragraph>
                {getI18nValue('Assistive_Text_Interactivity')}{' '}
                <Link styles={linkStyles} onClick={openInteractivityLink}>
                    {getI18nValue('Link_Interactivity_Doc')}
                </Link>
            </Paragraph>
            {(enableSelection && (
                <>
                    <Stack tokens={stackTokens}>
                        <SelectionMaxDataPoints />
                    </Stack>
                    <Paragraph>
                        {getI18nValue(
                            'Objects_Vega_SelectionMaxDataPoints_Description'
                        )}
                    </Paragraph>
                </>
            )) || <></>}
        </>
    );
};
