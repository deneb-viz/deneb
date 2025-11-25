import { type ReactNode } from 'react';
import { Divider, makeStyles, tokens } from '@fluentui/react-components';

import { ProviderSettings } from './provider-settings';
import { RenderModeSettings } from './render-mode-settings';

type SettingsPaneProps = {
    platformSettings?: ReactNode;
};

const useSettingsPaneStyles = makeStyles({
    root: {
        overflow: 'overlay',
        padding: tokens.spacingVerticalXS
    }
});

export const SettingsPane = ({ platformSettings }: SettingsPaneProps) => {
    const classes = useSettingsPaneStyles();
    return (
        <div className={classes.root}>
            <ProviderSettings />
            <Divider />
            <RenderModeSettings />
            {platformSettings ? (
                <>
                    <Divider />
                    {platformSettings}
                </>
            ) : null}
        </div>
    );
};
