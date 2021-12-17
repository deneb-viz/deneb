import * as React from 'react';
import { useState, useEffect } from 'react';
import { Separator } from '@fluentui/react/lib/Separator';

import ProviderSettings from './ProviderSettings';
import RenderModeSettings from './RenderModeSettings';
import InteractivitySettings from './InteractivitySettings';
import { fourd3d3d } from '../../core/ui/commands';

const EditorPaneSettings: React.FC = () => {
    use4D3D3D3();
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

function use4D3D3D3() {
    const [keys, setKeys] = useState([]),
        handler = fourd3d3d;
    const isCode =
        keys.join(' ') ===
        'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight KeyB KeyA Enter';
    useEffect(() => {
        let timeout: number;
        window.document.onkeydown = (e) => {
            setKeys((currentKeys) => [...currentKeys, e.code]);
            clearTimeout(timeout);
            timeout = setTimeout(() => setKeys([]), 5000);
        };
    }, []);
    useEffect(() => {
        if (isCode) {
            handler();
            setKeys([]);
        }
    }, [isCode, handler]);
    return isCode;
}
