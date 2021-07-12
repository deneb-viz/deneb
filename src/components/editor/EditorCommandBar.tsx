import * as React from 'react';

import { CommandBar } from '@fluentui/react/lib/CommandBar';

import { commandBarStyles } from '../../config/styles';
import {
    getCommandBarEditCommands,
    getCommandBarFarCommands
} from '../../api/ui';
import { getHostLM } from '../../api/i18n';
import _ from 'lodash';

const EditorCommandBar: React.FC = () => {
    const i18n = getHostLM(),
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
