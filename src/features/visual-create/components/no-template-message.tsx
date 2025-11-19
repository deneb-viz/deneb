import React from 'react';
import { Body1, Divider } from '@fluentui/react-components';

import { useCreateStyles } from './';
import { getI18nValue } from '../../i18n';
import { Hyperlink } from '../../interface';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

export const NoTemplateMessage: React.FC = () => {
    const classes = useCreateStyles();
    return (
        <>
            <div className={classes.noTemplateMessage}>
                <Body1>{getI18nValue('Text_No_Template_Selected')}</Body1>
            </div>
            <Divider />
            <div className={classes.additionalResourcesMessage}>
                <Body1>
                    {getI18nValue('Text_Create_Discover_More')}
                    <ul>
                        <li>
                            <Hyperlink
                                href={
                                    PROVIDER_RESOURCE_CONFIGURATION.deneb
                                        .examplesUrl
                                }
                            >
                                {getI18nValue(
                                    'Text_Link_Create_Deneb_Community'
                                )}
                            </Hyperlink>
                        </li>
                        <li>
                            <Hyperlink
                                href={
                                    PROVIDER_RESOURCE_CONFIGURATION.vega
                                        .examplesUrl
                                }
                            >
                                {getI18nValue('Text_Link_Create_Vega_Examples')}
                            </Hyperlink>
                        </li>
                        <li>
                            <Hyperlink
                                href={
                                    PROVIDER_RESOURCE_CONFIGURATION.vegaLite
                                        .examplesUrl
                                }
                            >
                                {getI18nValue(
                                    'Text_Link_Create_VegaLite_Examples'
                                )}
                            </Hyperlink>
                        </li>
                    </ul>
                </Body1>
            </div>
        </>
    );
};
