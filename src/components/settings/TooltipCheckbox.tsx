import * as React from 'react';
import { useSelector } from 'react-redux';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { commandService } from '../../services';
import { isHandlerEnabled } from '../../api/tooltip';

const TooltipCheckbox = () => {
    Debugger.log('Rendering Component: [TooltipCheckbox]...');
    const { i18n, settings } = useSelector(state).visual,
        { vega } = settings,
        handleTooltips = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                Debugger.log(`Updating tooltips to ${checked}...`);
                commandService.updateBooleanProperty('enableTooltips', value);
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
