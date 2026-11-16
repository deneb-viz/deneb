import React from 'react';

import {
    LandingPageCard,
    LandingPageLayout,
    LandingPageLinks
} from '@deneb-viz/powerbi-host';
import {
    DataHistogram24Regular,
    Edit24Regular,
    QuestionCircle24Regular,
    TableAdd24Regular
} from '@fluentui/react-icons';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '@deneb-viz/app-core';
import {
    PROVIDER_RESOURCE_CONFIGURATION,
    WEBSITE_URL
} from '@deneb-viz/configuration';
import {
    APPLICATION_DESCRIPTION,
    APPLICATION_VERSION
} from '../../../lib/application';

/**
 * Provides the landing page for cases where the visual does not have data or a
 * specification to render. This provides instructions on how to get started.
 */
export const LandingPage: React.FC = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    logRender('LandingPage');
    return (
        <LandingPageLayout
            version={APPLICATION_VERSION}
            description={APPLICATION_DESCRIPTION}
        >
            <LandingPageCard
                i18nHeader='PowerBI_Landing_Add_Data_Heading'
                i18nSubtitle='PowerBI_Landing_Add_Data_Subtitle'
                image={<TableAdd24Regular />}
                i18nBody='PowerBI_Landing_Add_Data_Body'
            />
            <LandingPageCard
                i18nHeader='PowerBI_Landing_Create_Visual_Heading'
                i18nSubtitle='PowerBI_Landing_Create_Visual_Subtitle'
                image={<Edit24Regular />}
                i18nBody='PowerBI_Landing_Create_Visual_Body'
            />
            <LandingPageCard
                i18nHeader='PowerBI_Landing_Experience_Visual_Heading'
                image={<DataHistogram24Regular />}
                i18nBody='PowerBI_Landing_Experience_Visual_Body'
            />
            <LandingPageCard
                i18nHeader='PowerBI_Landing_Resources_Heading'
                image={<QuestionCircle24Regular />}
            >
                <LandingPageLinks
                    links={[
                        {
                            href: WEBSITE_URL,
                            text: `${translate(
                                'PowerBI_Landing_Resources_Deneb'
                            )} ${translate('PowerBI_Landing_Link_Deneb_Doc')}`
                        },
                        {
                            href: PROVIDER_RESOURCE_CONFIGURATION.vega
                                .documentationUrl,
                            text: `${translate(
                                'PowerBI_Landing_Link_Vega_Doc'
                            )} ${translate(
                                'PowerBI_Landing_Resources_Vega_Suffix'
                            )}`
                        },
                        {
                            href: PROVIDER_RESOURCE_CONFIGURATION.vegaLite
                                .documentationUrl,
                            text: `${translate(
                                'PowerBI_Landing_Link_VegaLite_Doc'
                            )} ${translate(
                                'PowerBI_Landing_Resources_Vega_Suffix'
                            )}`
                        }
                    ]}
                />
            </LandingPageCard>
        </LandingPageLayout>
    );
};
