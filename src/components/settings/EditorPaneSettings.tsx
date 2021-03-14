import * as React from 'react';
import { Separator } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import ProviderSettings from './ProviderSettings';
import RenderModeSettings from './RenderModeSettings';
import InteractivitySettings from './InteractivitySettings';

const EditorPaneSettings: React.FC = () => {
    Debugger.log('Rendering Component: [EditorPaneSettings]...');
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
