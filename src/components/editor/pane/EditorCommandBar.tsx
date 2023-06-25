import React from 'react';

import { CommandBar } from '@fluentui/react/lib/CommandBar';

import {
    getCommandBarItems,
    getCommandBarFarItems,
    commandBarStyles,
    getCommandBarOverflowItems,
    commandBarOverflowProps
} from '../../../core/ui/commandBar';

import { logRender } from '../../../features/logging';
import { getI18nValue } from '../../../features/i18n';

const EditorCommandBar: React.FC = () => {
    const items = getCommandBarItems();
    const overflowItems = getCommandBarOverflowItems();
    const overflowButtonProps = commandBarOverflowProps();
    const farItems = getCommandBarFarItems();
    logRender('EditorCommandBar');
    return (
        <div style={{ width: '100%' }}>
            <CommandBar
                items={items}
                overflowItems={overflowItems}
                overflowButtonProps={overflowButtonProps}
                farItems={farItems}
                ariaLabel={getI18nValue('CommandBar_Aria_Label')}
                styles={commandBarStyles}
            />
        </div>
    );
};

export default EditorCommandBar;
