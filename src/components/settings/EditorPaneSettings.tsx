import React from 'react';
import { Separator } from '@fluentui/react/lib/Separator';

import ProviderSettings from './ProviderSettings';
import RenderModeSettings from './RenderModeSettings';
import { InteractivitySettings } from '../../features/interactivity';

const EditorPaneSettings: React.FC = () => {
    return (
        <div>
            <ProviderSettings />
            <Separator />
            <RenderModeSettings />
            <Separator />
            <InteractivitySettings />
        </div>
    );
};

export default EditorPaneSettings;
