import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@fluentui/react/lib/Link';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

import Debugger from '../../Debugger';
import { visualMetadata, vegaResources } from '../../config';
import {
    landingVisualNameStyles,
    landingVisualDescriptionStyles,
    landingVisualVersionStyles,
    landingVerticalStackStyles,
    landingVerticalStackItemStyles,
    landingHorizontalSeparatorStyles,
    landingVerticalInnerStackTokens,
    landingVerticalOuterStackTokens,
    landingSectionHeadingStyles,
    landingResourceInnerStackTokens,
    landingVerticalStackOuterStyles,
    linkStyles
} from '../../config/styles';
import { state } from '../../store';

const LandingPage = () => {
    Debugger.log('Rendering component: [LandingPage]');
    const root = useSelector(state),
        { i18n } = root.visual;
    return (
        <>
            <Stack
                styles={landingVerticalStackOuterStyles}
                tokens={landingVerticalOuterStackTokens}
            >
                <Stack
                    styles={landingVerticalStackStyles}
                    tokens={landingVerticalInnerStackTokens}
                >
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <div>
                                    <Text styles={landingVisualNameStyles}>
                                        {visualMetadata.displayName}
                                    </Text>
                                </div>
                                <div>
                                    <Text
                                        styles={landingVisualDescriptionStyles}
                                    >
                                        {visualMetadata.description}
                                    </Text>
                                </div>
                                <div>
                                    <Text styles={landingVisualVersionStyles}>
                                        {visualMetadata.version} |{' '}
                                        {i18n.getDisplayName('Provider_Vega')}:{' '}
                                        {vegaResources.vega.version} |{' '}
                                        {i18n.getDisplayName(
                                            'Provider_VegaLite'
                                        )}
                                        : {vegaResources.vegaLite.version}
                                    </Text>
                                </div>
                            </Stack.Item>
                            <Stack.Item>
                                <div className='visual-header-image logo' />
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Separator styles={landingHorizontalSeparatorStyles} />
                    </Stack.Item>
                    <Stack.Item
                        verticalFill
                        styles={landingVerticalStackItemStyles}
                    >
                        <div>
                            <Text styles={landingSectionHeadingStyles}>
                                {i18n.getDisplayName('Landing_Data_Heading')}
                            </Text>
                        </div>
                        {resolveDataInstruction()}
                        {resolveResourceDetail()}
                    </Stack.Item>
                </Stack>
            </Stack>
        </>
    );
};

export default LandingPage;

function resolveResourceDetail() {
    const root = useSelector(state),
        { i18n, launchUrl } = root.visual,
        openSupportLink = () => {
            launchUrl(visualMetadata.supportUrl);
        },
        openVegaDocLink = () => {
            launchUrl(vegaResources.vega.documentationUrl);
        },
        openVegaLiteDocLink = () => {
            launchUrl(vegaResources.vegaLite.documentationUrl);
        };
    return (
        <div>
            <div>
                <Text styles={landingSectionHeadingStyles}>
                    {i18n.getDisplayName('Landing_Resources_Heading')}
                </Text>
            </div>
            <Stack horizontal tokens={landingResourceInnerStackTokens}>
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
            <div>
                <Text styles={landingVisualVersionStyles}>
                    {i18n.getDisplayName('Landing_Resources_Naming')}
                </Text>
            </div>
        </div>
    );
}

function resolveDataInstruction() {
    const root = useSelector(state),
        { editMode, i18n } = root.visual;
    switch (editMode) {
        case EditMode.Advanced: {
            return (
                <div>
                    <p>
                        {i18n.getDisplayName('Landing_EditMode_Assistive_01')}
                    </p>
                </div>
            );
        }
        default: {
            return (
                <div>
                    <p>{i18n.getDisplayName('Landing_Assistive_01')}</p>
                    <p>{i18n.getDisplayName('Landing_Assistive_02')}</p>
                </div>
            );
        }
    }
}
