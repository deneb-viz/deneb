import * as React from 'react';
import { Checkbox } from '@fluentui/react/lib/Checkbox';

import store from '../../store';
import { updateBooleanProperty } from '../../core/ui/commands';
import { i18nValue } from '../../core/ui/i18n';
import { IS_TOOLTIP_HANDLER_ENABLED } from '../../features/interactivity';

interface IInteractivityCheckboxProps {
    propertyName: string;
    i18nLabelKey: string;
}

const InteractivityCheckbox: React.FC<IInteractivityCheckboxProps> = ({
    propertyName,
    i18nLabelKey
}) => {
    const { vega } = store((state) => state.visualSettings),
        handleToggle = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, checked: boolean): void => {
                const value = !!checked;
                updateBooleanProperty(propertyName, value);
            },
            []
        );
    return (
        IS_TOOLTIP_HANDLER_ENABLED && (
            <Checkbox
                label={i18nValue(i18nLabelKey)}
                checked={vega[propertyName]}
                onChange={handleToggle}
            />
        )
    );
};

export default InteractivityCheckbox;
