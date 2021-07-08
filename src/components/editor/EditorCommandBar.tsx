import * as React from 'react';
import { useSelector } from 'react-redux';
import { CommandBar } from '@fluentui/react/lib/CommandBar';

import { state } from '../../store';
import { commandBarStyles } from '../../config/styles';
import {
    getCommandBarEditCommands,
    getCommandBarFarCommands
} from '../../api/ui';

const EditorCommandBar: React.FC = () => {
    const { i18n } = useSelector(state).visual,
        _items = getCommandBarEditCommands(),
        _farItems = getCommandBarFarCommands();

    return (
        <div style={{ width: '100%' }}>
            <CommandBar
                items={_items}
                farItems={_farItems}
                ariaLabel={i18n.getDisplayName('CommandBar_Aria_Label')}
                styles={commandBarStyles}
            />
        </div>
    );
};

export default EditorCommandBar;
