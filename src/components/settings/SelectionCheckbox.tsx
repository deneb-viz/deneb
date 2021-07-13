import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isDataPointEnabled } from '../../api/selection';
import { hostServices } from '../../core/services';
import { i18nValue } from '../../core/ui/i18n';

const SelectionCheckbox = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
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
                label={i18nValue('Objects_Vega_EnableSelection')}
                checked={vega.enableSelection}
                onChange={handleSelection}
                disabled={disabled}
            />
        )
    );
};

export default SelectionCheckbox;
