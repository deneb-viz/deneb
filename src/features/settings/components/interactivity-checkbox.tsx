import React, { useMemo } from 'react';
import { Checkbox, CheckboxOnChangeData } from '@fluentui/react-components';

import store from '../../../store';
import { updateBooleanProperty } from '../../../core/ui/commands';
import { TInteractivityType } from '../../interactivity/types';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';
import { getVisualSelectionManager } from '@deneb-viz/powerbi-compat/visual-host';

interface IInteractivityCheckboxProps {
    type: TInteractivityType;
}

export const InteractivityCheckbox: React.FC<IInteractivityCheckboxProps> = ({
    type
}) => {
    const { interactivity } = store((state) => state.visualSettings.vega);
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
                getVisualSelectionManager().hasSelection()
            ) {
                getVisualSelectionManager().clear();
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
                checked={interactivity[propertyName]?.value || false}
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
        default:
            return true;
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
