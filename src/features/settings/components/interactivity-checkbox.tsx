import React, { useMemo } from 'react';
import { Checkbox, CheckboxOnChangeData } from '@fluentui/react-components';

import store from '../../../store';
import { updateBooleanProperty } from '../../../core/ui/commands';
import { TInteractivityType } from '../../interactivity/types';
import { hostServices } from '../../../core/services';
import { IS_TOOLTIP_HANDLER_ENABLED } from '../../interactivity/tooltip';
import { IS_CROSS_FILTER_ENABLED } from '../../interactivity/cross-filter';
import { IS_CROSS_HIGHLIGHT_ENABLED } from '../../interactivity/cross-highlight';
import { IS_CONTEXT_MENU_ENABLED } from '../../interactivity/context-menu';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';

interface IInteractivityCheckboxProps {
    type: TInteractivityType;
}

export const InteractivityCheckbox: React.FC<IInteractivityCheckboxProps> = ({
    type
}) => {
    const { vega } = store((state) => state.visualSettings);
    const { selectionManager } = hostServices;
    const propertyName = useMemo(() => getPropertyName(type), [type]);
    const classes = useSettingsStyles();
    const handleToggle = React.useCallback(
        (
            ev: React.ChangeEvent<HTMLInputElement>,
            data: CheckboxOnChangeData
        ): void => {
            const value = !!data.checked;
            if (
                type === 'select' &&
                !value &&
                selectionManager.hasSelection()
            ) {
                selectionManager.clear();
            }
            updateBooleanProperty(propertyName, value);
        },
        []
    );
    const status = useMemo(() => getFeatureStatus(type), [type]);
    return (
        status && (
            <Checkbox
                label={getI18nValue(geti18LabelKey(type))}
                checked={vega[propertyName]}
                onChange={handleToggle}
                className={classes.sectionItem}
            />
        )
    );
};

/**
 * Resolves feature flag status for the supplied type.
 */
const getFeatureStatus = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return IS_CONTEXT_MENU_ENABLED;
        case 'highlight':
            return IS_CROSS_HIGHLIGHT_ENABLED;
        case 'select':
            return IS_CROSS_FILTER_ENABLED;
        case 'tooltip':
            return IS_TOOLTIP_HANDLER_ENABLED;
    }
};

/**
 * Resolves i18n label key for the supplied type.
 */
const geti18LabelKey = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return 'Objects_Vega_EnableContextMenu';
        case 'highlight':
            return 'Objects_Vega_EnableHighlight';
        case 'select':
            return 'Objects_Vega_EnableSelection';
        case 'tooltip':
            return 'Objects_Vega_EnableTooltips';
    }
};

/**
 * Resolves property to persist for toggle state, for the supplied type.
 */
const getPropertyName = (type: TInteractivityType) => {
    switch (type) {
        case 'context':
            return 'enableContextMenu';
        case 'highlight':
            return 'enableHighlight';
        case 'select':
            return 'enableSelection';
        case 'tooltip':
            return 'enableTooltips';
    }
};
