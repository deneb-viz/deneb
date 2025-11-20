import React, { useState } from 'react';
import { Caption1, Tooltip, makeStyles } from '@fluentui/react-components';

import {
    getVegaVersion,
    type SpecProvider
} from '@deneb-viz/vega-runtime/embed';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { TooltipCustomMount } from '../../../components/ui';
import { useDenebState } from '../../../state';
import { getVegaProviderI18n } from '../../../lib/vega';

const useProviderStyles = makeStyles({
    root: {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    caption: {
        whiteSpace: 'nowrap'
    }
});

export const ProviderDetail = () => {
    const vegaProvider = useDenebState(
        (state) =>
            state.visualSettings.vega.output.provider.value as SpecProvider
    );
    const provider = getI18nValue(getVegaProviderI18n(vegaProvider));
    const version = getVegaVersion(vegaProvider);
    const classes = useProviderStyles();
    const [ref, setRef] = useState<HTMLElement | null>(null);
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
