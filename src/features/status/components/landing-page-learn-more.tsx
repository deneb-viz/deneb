import React from 'react';
import { Caption1 } from '@fluentui/react-components';

import { useStatusStyles } from '.';
import { getI18nValue } from '../../i18n';
import {
    APPLICATION_INFORMATION_CONFIGURATION,
    PROVIDER_RESOURCE_CONFIGURATION
} from '@deneb-viz/configuration';
import { Hyperlink } from '@deneb-viz/app-core';

/**
 * Provides the hyperlinks to associated documentation for the landing page.
 */
export const LandingPageLearnMore: React.FC = () => {
    const classes = useStatusStyles();
    return (
        <div>
            <ul className={classes.landingUl}>
                <li className={classes.landingLi}>
                    <Hyperlink
                        href={APPLICATION_INFORMATION_CONFIGURATION.supportUrl}
                    >
                        <Caption1>{`${getI18nValue(
                            'Text_Landing_Resources_Deneb'
                        )} ${getI18nValue(
                            'Text_Link_Landing_Deneb_Doc'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
                <li className={classes.landingLi}>
                    <Hyperlink
                        href={
                            PROVIDER_RESOURCE_CONFIGURATION.vega
                                .documentationUrl
                        }
                    >
                        <Caption1>{`${getI18nValue(
                            'Link_Vega_Doc'
                        )} ${getI18nValue(
                            'Text_Landing_Resources_Vega_Suffix'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
                <li className={classes.landingLi}>
                    <Hyperlink
                        href={
                            PROVIDER_RESOURCE_CONFIGURATION.vegaLite
                                .documentationUrl
                        }
                    >
                        <Caption1>{`${getI18nValue(
                            'Link_VegaLite_Doc'
                        )} ${getI18nValue(
                            'Text_Landing_Resources_Vega_Suffix'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
            </ul>
        </div>
    );
};
