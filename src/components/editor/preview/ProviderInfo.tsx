import React from 'react';

import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { i18nValue } from '../../../core/ui/i18n';
import { Assistive } from '../../elements/Typography';
import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';
import { reactLog } from '../../../core/utils/logger';

const valueStackItemStyles: IStackItemStyles = {
    root: {
        cursor: 'default',
        userSelect: 'none'
    }
};

const ProviderInfo: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
    reactLog('Rendering [ProviderInfo]');
    return (
        <>
            <StackItem shrink styles={valueStackItemStyles}>
                <TooltipHost content={i18nValue('Current_Provider_Tooltip')}>
                    <Assistive>
                        {provider} {version}
                    </Assistive>
                </TooltipHost>
            </StackItem>
        </>
    );
};

export default ProviderInfo;
