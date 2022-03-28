import React from 'react';

import { CommandBar } from '@fluentui/react/lib/CommandBar';

import {
    getCommandBarItems,
    getCommandBarFarItems,
    commandBarStyles,
    getCommandBarOverflowItems,
    commandBarOverflowProps
} from '../../../core/ui/commandBar';

import { i18nValue } from '../../../core/ui/i18n';
import { reactLog } from '../../../core/utils/logger';

const EditorCommandBar: React.FC = () => {
    const items = getCommandBarItems();
    const overflowItems = getCommandBarOverflowItems();
    const overflowButtonProps = commandBarOverflowProps();
    const farItems = getCommandBarFarItems();
    reactLog('Rendering [EditorCommandBar]');
    return (
        <div style={{ width: '100%' }}>
            <CommandBar
                items={items}
                overflowItems={overflowItems}
                overflowButtonProps={overflowButtonProps}
                farItems={farItems}
                ariaLabel={i18nValue('CommandBar_Aria_Label')}
                styles={commandBarStyles}
            />
        </div>
    );
};

export default EditorCommandBar;
