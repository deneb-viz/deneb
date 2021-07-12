import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isDataPointEnabled } from '../../api/selection';
import { getHostLM } from '../../api/i18n';
import { hostServices } from '../../core/host';

const SelectionCheckbox = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        i18n = getHostLM(),
        { selectionManager } = hostServices,
        handleSelection = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                if (!value && selectionManager.hasSelection()) {
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
