import * as React from 'react';

import { CommandBar } from '@fluentui/react/lib/CommandBar';

import {
    getCommandBarItems,
    getCommandBarFarItems,
    commandBarStyles
} from '../../core/ui/commandBar';

import { i18nValue } from '../../core/ui/i18n';

const EditorCommandBar: React.FC = () => (
    <div style={{ width: '100%' }}>
        <CommandBar
            items={getCommandBarItems()}
            farItems={getCommandBarFarItems()}
            ariaLabel={i18nValue('CommandBar_Aria_Label')}
            styles={commandBarStyles}
        />
    </div>
);

export default EditorCommandBar;
