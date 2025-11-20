import React from 'react';
import { Body1, Divider, makeStyles, tokens } from '@fluentui/react-components';

import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { Hyperlink } from '../../../components/ui';

export const useNoTemplateMessage = makeStyles({
    additionalResourcesMessage: {
        height: '25%',
        margin: tokens.spacingVerticalXXL
    },
    noTemplateMessage: {
        display: 'flex',
        alignItems: 'center',
        height: '25%',
        fontStyle: 'italic',
        marginLeft: tokens.spacingHorizontalXXL
    }
});

export const NoTemplateMessage = () => {
    const classes = useNoTemplateMessage();
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
