import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import { state } from '../../store';
import { updateBooleanProperty } from '../../api/commands';
import { isHandlerEnabled } from '../../api/tooltip';
import { getHostLM } from '../../api/i18n';

const TooltipCheckbox = () => {
    const { settings } = useSelector(state).visual,
        { vega } = settings,
        i18n = getHostLM(),
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
                label={i18n.getDisplayName('Objects_Vega_EnableTooltips')}
                checked={vega.enableTooltips}
                onChange={handleTooltips}
            />
        )
    );
};

export default TooltipCheckbox;
