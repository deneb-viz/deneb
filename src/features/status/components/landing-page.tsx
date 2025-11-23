import React from 'react';

import { StatusContainer } from './status-container';
import { LandingPageInfoHeader } from './landing-page-info-header';
import { LandingPageCard } from './landing-page-card';
import { LandingPageLearnMore } from './landing-page-learn-more';
import { Caption1 } from '@fluentui/react-components';
import { useStatusStyles } from '.';
import {
    DataHistogram24Regular,
    Edit24Regular,
    QuestionCircle24Regular,
    TableAdd24Regular
} from '@fluentui/react-icons';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Provides the landing page for cases where the visual does not have data or a
 * specification to render. This provides instructions on how to get started.
 */
export const LandingPage: React.FC = () => {
    const classes = useStatusStyles();
    logRender('LandingPage');
    return (
        <StatusContainer>
            <LandingPageInfoHeader />
            <div className={classes.cardContainer}>
                <LandingPageCard
                    i18nHeader='Text_Landing_Add_Data_Heading'
                    i18nSubtitle='Text_Landing_Add_Data_Subtitle'
                    image={<TableAdd24Regular />}
                >
                    <Caption1 className={classes.cardDescription}>
                        {getI18nValue('Text_Landing_Add_Data_Body')}
                    </Caption1>
                </LandingPageCard>
                <LandingPageCard
                    i18nHeader='Text_Landing_Create_Visual_Heading'
                    i18nSubtitle='Text_Landing_Create_Visual_Subtitle'
                    image={<Edit24Regular />}
                >
                    <Caption1 className={classes.cardDescription}>
                        {getI18nValue('Text_Landing_Create_Visual_Body')}
                    </Caption1>
                </LandingPageCard>
                <LandingPageCard
                    i18nHeader='Text_Landing_Experience_Visual_Heading'
                    image={<DataHistogram24Regular />}
                >
                    <Caption1 className={classes.cardDescription}>
                        {getI18nValue('Text_Landing_Experience_Visual_Body')}
                    </Caption1>
                </LandingPageCard>
                <LandingPageCard
                    i18nHeader='Text_Landing_Resources_Heading'
                    image={<QuestionCircle24Regular />}
                >
                    <LandingPageLearnMore />
                </LandingPageCard>
            </div>
        </StatusContainer>
    );
};
