import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { commandService } from '../../services';
import { isContextMenuEnabled } from '../../api/selection';

const ContextMenuCheckbox = () => {
    Debugger.log('Rendering Component: [ContextMenuCheckbox]...');
    const { i18n, settings } = useSelector(state).visual,
        { vega } = settings,
        handleContextMenu = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                Debugger.log(`Updating context menu to ${checked}...`);
                commandService.updateBooleanProperty(
                    'enableContextMenu',
                    value
                );
            },
            []
        );
    return (
        isContextMenuEnabled && (
            <Checkbox
                label={i18n.getDisplayName('Objects_Vega_EnableContextMenu')}
                checked={vega.enableContextMenu}
                onChange={handleContextMenu}
            />
        )
    );
};

export default ContextMenuCheckbox;
