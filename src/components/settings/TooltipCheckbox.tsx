import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isHandlerEnabled } from '../../core/interactivity/tooltip';
import { i18nValue } from '../../core/ui/i18n';

const TooltipCheckbox = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        handleTooltips = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                updateBooleanProperty('enableTooltips', value);
            },
            []
        );
    return (
        isHandlerEnabled && (
            <Checkbox
                label={i18nValue('Objects_Vega_EnableTooltips')}
                checked={vega.enableTooltips}
                onChange={handleTooltips}
            />
        )
    );
};

export default TooltipCheckbox;
