import * as React from 'react';
import { useSelector } from 'react-redux';

import { Link, ILinkStyles } from '@fluentui/react/lib/Link';
import { IStackTokens, Stack } from '@fluentui/react/lib/Stack';

import { state } from '../../store';
import { getConfig, getVisualMetadata } from '../../api/config';
import { theme } from '../../api/fluent';
import { getHostLM } from '../../api/i18n';

import { BodyHeading } from '../elements/Text';

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
    const root = useSelector(state),
        i18n = getHostLM(),
        { launchUrl } = root.visual,
        visualMetadata = getVisualMetadata(),
        { providerResources } = getConfig(),
        openSupportLink = () => {
            launchUrl(visualMetadata.supportUrl);
        },
        openVegaDocLink = () => {
            launchUrl(providerResources.vega.documentationUrl);
        },
        openVegaLiteDocLink = () => {
            launchUrl(providerResources.vegaLite.documentationUrl);
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
