import React from 'react';

import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';
import { Caption1, Tooltip } from '@fluentui/react-components';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

export const ProviderDetail: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
    logRender('ProviderDetail');
    return (
        <Tooltip
            content={getI18nValue('Current_Provider_Tooltip')}
            relationship='label'
        >
            <Caption1>
                {provider} {version}
            </Caption1>
        </Tooltip>
    );
};
