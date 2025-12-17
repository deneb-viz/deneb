import { useState } from 'react';
import { Caption1, Tooltip, makeStyles } from '@fluentui/react-components';

import { getVegaVersion } from '@deneb-viz/vega-runtime/embed';
import { logRender } from '@deneb-viz/utils/logging';
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
    const { provider, translate } = useDenebState((state) => ({
        provider: state.project.provider,
        translate: state.i18n.translate
    }));
    if (provider) {
        const providerName = translate(getVegaProviderI18n(provider));
        const version = getVegaVersion(provider);
        const classes = useProviderStyles();
        const [ref, setRef] = useState<HTMLElement | null>(null);
        logRender('ProviderDetail');
        return (
            <div className={classes.root}>
                <Tooltip
                    content={translate('Tooltip_Current_Provider')}
                    relationship='label'
                    withArrow
                    mountNode={ref}
                >
                    <Caption1 className={classes.caption}>
                        {providerName} {version}
                    </Caption1>
                </Tooltip>
                <TooltipCustomMount setRef={setRef} />
            </div>
        );
    }
};
