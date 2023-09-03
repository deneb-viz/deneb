import React from 'react';
import { Divider } from '@fluentui/react-components';

import { ProviderSettings } from './provider-settings';
import { RenderModeSettings } from './render-mode-settings';
import { InteractivitySettings } from './interactivity-settings';
import { useSettingsStyles } from '.';

export const SettingsPane: React.FC = () => {
    const classes = useSettingsStyles();
    return (
        <div className={classes.paneContainer}>
            <ProviderSettings />
            <Divider />
            <RenderModeSettings />
            <Divider />
            <InteractivitySettings />
        </div>
    );
};
