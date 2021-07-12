import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isContextMenuEnabled } from '../../api/selection';
import { getHostLM } from '../../api/i18n';

const ContextMenuCheckbox = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        i18n = getHostLM(),
        handleContextMenu = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                updateBooleanProperty('enableContextMenu', value);
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
