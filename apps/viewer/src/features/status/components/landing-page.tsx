import { type ReactElement } from 'react';
import {
    ArrowUpload24Regular,
    DataHistogram24Regular,
    QuestionCircle24Regular,
    TableAdd24Regular
} from '@fluentui/react-icons';

import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { useDenebState } from '@deneb-viz/app-core';
import {
    LandingPageCard,
    LandingPageLayout,
    LandingPageLinks
} from '@deneb-viz/powerbi-host';
import { logRender } from '@deneb-viz/utils/logging';
import {
    APPLICATION_DESCRIPTION,
    APPLICATION_VERSION,
    COMMUNITY_RESOURCES_URL,
    TEMPLATES_DOCUMENTATION_URL
} from '../../../lib/application';
import { type LandingSteps } from '../landing-steps';

type LandingPageProps = {
    steps: LandingSteps;
    /** The import action, shown in the Import a template card when due. */
    importAction?: ReactElement;
};

/**
 * Shown whenever there is nothing to render: the steps to set the visual up,
 * with the author's current step highlighted, then where to learn more.
 */
export const LandingPage = ({ steps, importAction }: LandingPageProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    logRender('LandingPage');
    return (
        <LandingPageLayout
            version={APPLICATION_VERSION}
            description={APPLICATION_DESCRIPTION}
            inset
        >
            <LandingPageCard
                i18nHeader='PowerBI_Viewer_Landing_Add_Data_Heading'
                i18nSubtitle='PowerBI_Viewer_Landing_Add_Data_Subtitle'
                image={<TableAdd24Regular />}
                i18nBody={
                    steps.addDataBody === 'template-saved'
                        ? 'PowerBI_Viewer_Landing_Add_Data_Template_Body'
                        : 'PowerBI_Viewer_Landing_Add_Data_Body'
                }
                step={steps.addData}
            />
            <LandingPageCard
                i18nHeader='PowerBI_Viewer_Landing_Import_Heading'
                i18nSubtitle='PowerBI_Viewer_Landing_Import_Subtitle'
                image={<ArrowUpload24Regular />}
                i18nBody='PowerBI_Viewer_Landing_Import_Body'
                step={steps.importTemplate}
                action={steps.showImport ? importAction : undefined}
            />
            <LandingPageCard
                i18nHeader='PowerBI_Viewer_Landing_Experience_Heading'
                image={<DataHistogram24Regular />}
                i18nBody='PowerBI_Viewer_Landing_Experience_Body'
            />
            <LandingPageCard
                i18nHeader='PowerBI_Viewer_Landing_Resources_Heading'
                image={<QuestionCircle24Regular />}
            >
                <LandingPageLinks
                    links={[
                        {
                            href: TEMPLATES_DOCUMENTATION_URL,
                            text: translate(
                                'PowerBI_Viewer_Landing_Link_Templates'
                            )
                        },
                        {
                            href: COMMUNITY_RESOURCES_URL,
                            text: translate(
                                'PowerBI_Viewer_Landing_Link_Community'
                            )
                        },
                        {
                            href: PROVIDER_RESOURCE_CONFIGURATION.vega
                                .documentationUrl,
                            text: translate('PowerBI_Viewer_Landing_Link_Vega')
                        },
                        {
                            href: PROVIDER_RESOURCE_CONFIGURATION.vegaLite
                                .documentationUrl,
                            text: translate(
                                'PowerBI_Viewer_Landing_Link_VegaLite'
                            )
                        }
                    ]}
                />
            </LandingPageCard>
        </LandingPageLayout>
    );
};
