import React from 'react';
import { Divider } from '@fluentui/react-components';

import { ProviderSettings } from './provider-settings';
import { RenderModeSettings } from './render-mode-settings';
import { InteractivitySettings } from './interactivity-settings';

export const SettingsPane: React.FC = () => {
    return (
        <div>
            <ProviderSettings />
            <Divider />
            <RenderModeSettings />
            <Divider />
            <InteractivitySettings />
        </div>
    );
};
