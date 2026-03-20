import { Caption1, Tooltip, makeStyles } from '@fluentui/react-components';

import { getVegaVersion } from '@deneb-viz/vega-runtime/embed';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { getVegaProviderI18n } from '../../../lib/vega/i18n';

const useProviderStyles = makeStyles({
    root: {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    caption: {
        whiteSpace: 'nowrap'
    }
});

type ProviderDetailProps = {
    tooltipMountNode?: HTMLElement | null;
};

export const ProviderDetail = ({ tooltipMountNode }: ProviderDetailProps) => {
    const { provider, translate } = useDenebState((state) => ({
        provider: state.project.provider,
        translate: state.i18n.translate
    }));
    const classes = useProviderStyles();

    if (!provider) {
        return null;
    }

    const providerName = translate(getVegaProviderI18n(provider));
    const version = getVegaVersion(provider);
    logRender('ProviderDetail');
    return (
        <div className={classes.root}>
            <Tooltip
                content={translate('Tooltip_Current_Provider')}
                relationship='label'
                withArrow
                mountNode={tooltipMountNode}
            >
                <Caption1 className={classes.caption}>
                    {providerName} {version}
                </Caption1>
            </Tooltip>
        </div>
    );
};
