import React from 'react';
import { Caption1 } from '@fluentui/react-components';

import { useStatusStyles } from '.';
import {
    PROVIDER_RESOURCE_CONFIGURATION,
    WEBSITE_URL
} from '@deneb-viz/configuration';
import { Hyperlink, useDenebState } from '@deneb-viz/app-core';

/**
 * Provides the hyperlinks to associated documentation for the landing page.
 */
export const LandingPageLearnMore: React.FC = () => {
    const classes = useStatusStyles();
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <div>
            <ul className={classes.landingUl}>
                <li className={classes.landingLi}>
                    <Hyperlink href={WEBSITE_URL}>
                        <Caption1>{`${translate(
                            'PowerBI_Landing_Resources_Deneb'
                        )} ${translate(
                            'PowerBI_Landing_Link_Deneb_Doc'
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
                        <Caption1>{`${translate(
                            'PowerBI_Landing_Link_Vega_Doc'
                        )} ${translate(
                            'PowerBI_Landing_Resources_Vega_Suffix'
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
                        <Caption1>{`${translate(
                            'PowerBI_Landing_Link_VegaLite_Doc'
                        )} ${translate(
                            'PowerBI_Landing_Resources_Vega_Suffix'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
            </ul>
        </div>
    );
};
