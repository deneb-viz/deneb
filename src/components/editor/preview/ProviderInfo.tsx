import React from 'react';

import { StackItem, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { i18nValue } from '../../../core/ui/i18n';
import { Assistive } from '../../elements/Typography';
import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';

const valueStackItemStyles: IStackItemStyles = {
    root: {
        padding: 4,
        cursor: 'default',
        userSelect: 'none'
    }
};

const ProviderInfo: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
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
