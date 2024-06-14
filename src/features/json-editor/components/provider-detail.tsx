import React, { useState } from 'react';
import { Caption1, Tooltip, makeStyles } from '@fluentui/react-components';

import { getVegaProvideri18n, getVegaVersion } from '../../../core/vega';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { TooltipCustomMount } from '../../interface';

const useProviderStyles = makeStyles({
    root: {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    caption: {
        whiteSpace: 'nowrap'
    }
});

export const ProviderDetail: React.FC = () => {
    const provider = getVegaProvideri18n();
    const version = getVegaVersion();
    const [ref, setRef] = useState<HTMLElement | null>();
    const classes = useProviderStyles();
    logRender('ProviderDetail');
    return (
        <div className={classes.root}>
            <Tooltip
                content={getI18nValue('Current_Provider_Tooltip')}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <Caption1 className={classes.caption}>
                    {provider} {version}
                </Caption1>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </div>
    );
};
