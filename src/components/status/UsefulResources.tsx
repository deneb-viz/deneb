import * as React from 'react';

import { Link, ILinkStyles } from '@fluentui/react/lib/Link';
import { IStackTokens, Stack } from '@fluentui/react/lib/Stack';

import { getConfig, getVisualMetadata } from '../../api/config';
import { theme } from '../../api/fluent';
import { getHostLM } from '../../api/i18n';

import { BodyHeading } from '../elements/Text';
import { hostServices } from '../../core/host';

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
    const i18n = getHostLM(),
        visualMetadata = getVisualMetadata(),
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
            <BodyHeading>
                {i18n.getDisplayName('Landing_Resources_Heading')}
            </BodyHeading>
            <Stack horizontal tokens={resourceStackTokens}>
                <Link styles={linkStyles} onClick={openSupportLink}>
                    {i18n.getDisplayName('Link_Homepage')}
                </Link>
                <Link styles={linkStyles} onClick={openVegaDocLink}>
                    {i18n.getDisplayName('Link_Vega_Doc')}
                </Link>
                <Link styles={linkStyles} onClick={openVegaLiteDocLink}>
                    {i18n.getDisplayName('Link_VegaLite_Doc')}
                </Link>
            </Stack>
        </>
    );
};

export default UsefulResources;
