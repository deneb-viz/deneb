import React from 'react';

import { i18nValue } from '../../../core/ui/i18n';
import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';
import { Caption1, Tooltip } from '@fluentui/react-components';
import { logRender } from '../../logging';

export const ProviderDetail: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
    logRender('ProviderDetail');
    return (
        <Tooltip
            content={i18nValue('Current_Provider_Tooltip')}
            relationship='label'
        >
            <Caption1>
                {provider} {version}
            </Caption1>
        </Tooltip>
    );
};
