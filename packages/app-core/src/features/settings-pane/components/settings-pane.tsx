import { Divider, makeStyles, tokens } from '@fluentui/react-components';

import { ProviderSettings } from './provider-settings';
import { RenderModeSettings } from './render-mode-settings';
import { PerformanceSettings } from './performance-settings';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';

const useSettingsPaneStyles = makeStyles({
    root: {
        overflow: 'overlay',
        padding: tokens.spacingVerticalXS
    }
});

export const SettingsPane = () => {
    const classes = useSettingsPaneStyles();
    const { settingsPanePlatformComponent } = useDenebPlatformProvider();
    return (
        <div className={classes.root}>
            <ProviderSettings />
            <Divider />
            <RenderModeSettings />
            <Divider />
            <PerformanceSettings />
            {settingsPanePlatformComponent ? (
                <>
                    <Divider />
                    {settingsPanePlatformComponent}
                </>
            ) : null}
        </div>
    );
};
