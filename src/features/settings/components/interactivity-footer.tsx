import { Caption1, tokens, makeStyles } from '@fluentui/react-components';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';

import { Hyperlink, useDenebState } from '@deneb-viz/app-core';

const useFooterStyles = makeStyles({
    root: {
        padding: tokens.spacingVerticalM,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXS
    }
});

export const InteractivityFooter = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useFooterStyles();
    return (
        <div className={classes.root}>
            <Caption1>
                {translate('PowerBI_Assistive_Text_Interactivity')}{' '}
                <Hyperlink
                    href={
                        PROVIDER_RESOURCE_CONFIGURATION.deneb
                            .interactivityDocumentationUrl
                    }
                    inline
                >
                    {translate('Text_Link_Learn_More')}
                </Hyperlink>
            </Caption1>
        </div>
    );
};
