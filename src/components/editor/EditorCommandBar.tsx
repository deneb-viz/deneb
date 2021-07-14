import * as React from 'react';

import { CommandBar } from '@fluentui/react/lib/CommandBar';

import { commandBarStyles } from '../../config/styles';
import {
    getCommandBarEditCommands,
    getCommandBarFarCommands
} from '../../api/ui';

import { i18nValue } from '../../core/ui/i18n';

const EditorCommandBar: React.FC = () => (
    <div style={{ width: '100%' }}>
        <CommandBar
            items={getCommandBarEditCommands()}
            farItems={getCommandBarFarCommands()}
            ariaLabel={i18nValue('CommandBar_Aria_Label')}
            styles={commandBarStyles}
        />
    </div>
);

export default EditorCommandBar;
