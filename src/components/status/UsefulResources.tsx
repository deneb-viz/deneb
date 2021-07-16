import * as React from 'react';

import { Link, ILinkStyles } from '@fluentui/react/lib/Link';
import { IStackTokens, Stack } from '@fluentui/react/lib/Stack';

import { getConfig, getVisualMetadata } from '../../core/utils/config';
import { theme } from '../../api/fluent';

import { BodyHeading } from '../elements/Typography';
import { hostServices } from '../../core/services';
import { i18nValue } from '../../core/ui/i18n';

const resourceStackTokens: IStackTokens = {
    childrenGap: 25,
    padding: 10
};

const linkStyles: ILinkStyles = {
    root: {
        color: theme.palette.themeDark
    }
};

const UsefulResources = () => {
    const visualMetadata = getVisualMetadata(),
        { providerResources } = getConfig(),
        openSupportLink = () => {
            hostServices.launchUrl(visualMetadata.supportUrl);
        },
        openVegaDocLink = () => {
            hostServices.launchUrl(providerResources.vega.documentationUrl);
        },
        openVegaLiteDocLink = () => {
            hostServices.launchUrl(providerResources.vegaLite.documentationUrl);
        };
    return (
        <>
            <BodyHeading>{i18nValue('Landing_Resources_Heading')}</BodyHeading>
            <Stack horizontal tokens={resourceStackTokens}>
                <Link styles={linkStyles} onClick={openSupportLink}>
                    {i18nValue('Link_Homepage')}
                </Link>
                <Link styles={linkStyles} onClick={openVegaDocLink}>
                    {i18nValue('Link_Vega_Doc')}
                </Link>
                <Link styles={linkStyles} onClick={openVegaLiteDocLink}>
                    {i18nValue('Link_VegaLite_Doc')}
                </Link>
            </Stack>
        </>
    );
};

export default UsefulResources;
