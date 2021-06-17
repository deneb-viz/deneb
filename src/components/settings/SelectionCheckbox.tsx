import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isDataPointEnabled } from '../../api/selection';

const SelectionCheckbox = () => {
    Debugger.log('Rendering Component: [SelectionCheckbox]...');
    const { i18n, selectionManager, settings } = useSelector(state).visual,
        { vega } = settings,
        handleSelection = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                Debugger.log(`Updating selection to ${checked}...`);
                if (!value && selectionManager.hasSelection()) {
                    Debugger.log(
                        'Selections are active. We need to clear down...'
                    );
                    selectionManager.clear();
                }
                updateBooleanProperty('enableSelection', value);
            },
            []
        ),
        disabled = vega.provider !== 'vegaLite';
    return (
        isDataPointEnabled && (
            <Checkbox
                label={i18n.getDisplayName('Objects_Vega_EnableSelection')}
                checked={vega.enableSelection}
                onChange={handleSelection}
                disabled={disabled}
            />
        )
    );
};

export default SelectionCheckbox;
