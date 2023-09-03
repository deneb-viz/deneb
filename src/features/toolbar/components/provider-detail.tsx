import React, { useState } from 'react';

import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';
import { Caption1, Tooltip } from '@fluentui/react-components';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { TooltipCustomMount } from '../../interface';

export const ProviderDetail: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
    const [ref, setRef] = useState<HTMLElement | null>();
    logRender('ProviderDetail');
    return (
        <>
            <Tooltip
                content={getI18nValue('Current_Provider_Tooltip')}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <Caption1>
                    {provider} {version}
                </Caption1>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};
