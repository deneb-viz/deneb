import React from 'react';
import { useStatusStyles } from '.';
import { getI18nValue } from '../../i18n';
import { Hyperlink } from '../../interface';
import { getConfig, getVisualMetadata } from '../../../core/utils/config';
import { Caption1 } from '@fluentui/react-components';

const VISUAL_METADATA = getVisualMetadata();
const VEGA_RESOURCES = getConfig().providerResources;

/**
 * Provides the hyperlinks to associated documentation for the landing page.
 */
export const LandingPageLearnMore: React.FC = () => {
    const classes = useStatusStyles();
    return (
        <div>
            <ul className={classes.landingUl}>
                <li className={classes.landingLi}>
                    <Hyperlink href={VISUAL_METADATA.supportUrl}>
                        <Caption1>{`${getI18nValue(
                            'Text_Landing_Resources_Deneb'
                        )} ${getI18nValue(
                            'Text_Link_Landing_Deneb_Doc'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
                <li className={classes.landingLi}>
                    <Hyperlink href={VEGA_RESOURCES.vega.documentationUrl}>
                        <Caption1>{`${getI18nValue(
                            'Link_Vega_Doc'
                        )} ${getI18nValue(
                            'Text_Landing_Resources_Vega_Suffix'
                        )}`}</Caption1>
                    </Hyperlink>
                </li>
                <li className={classes.landingLi}>
                    <Hyperlink href={VEGA_RESOURCES.vegaLite.documentationUrl}>
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
