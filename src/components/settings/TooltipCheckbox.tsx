import * as React from 'react';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import store from '../../store';
import { updateBooleanProperty } from '../../core/ui/commands';
import { isHandlerEnabled } from '../../core/interactivity/tooltip';
import { i18nValue } from '../../core/ui/i18n';

const TooltipCheckbox = () => {
    const { vega } = store((state) => state.visualSettings),
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
