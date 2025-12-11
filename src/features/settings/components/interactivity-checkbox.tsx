import { ChangeEvent, useCallback, useMemo } from 'react';
import { Checkbox, CheckboxOnChangeData } from '@fluentui/react-components';

import { useSettingsStyles } from '../styles';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import {
    handlePersistBooleanProperty,
    useDenebState
} from '@deneb-viz/app-core';
import { InteractivityManager } from '@deneb-viz/powerbi-compat/interactivity';

/**
 * Used to denote supported interactivity types within Deneb. These can be used
 * to flag any contextual methods for any particular functionality.
 */
type TInteractivityType = 'tooltip' | 'highlight' | 'select' | 'context';

type InteractivityCheckboxProps = {
    type: TInteractivityType;
};

export const InteractivityCheckbox = ({ type }: InteractivityCheckboxProps) => {
    const { interactivity } = useDenebState(
        (state) => state.visualSettings.vega
    );
    const propertyName = useMemo(() => getPropertyName(type), [type]);
    const classes = useSettingsStyles();
    const handleToggle = useCallback(
        (
            ev: ChangeEvent<HTMLInputElement>,
            data: CheckboxOnChangeData
        ): void => {
            const value = !!data.checked;
            if (
                type === 'select' &&
                !value &&
                InteractivityManager.hasSelection()
            ) {
                InteractivityManager.crossFilter();
            }
            handlePersistBooleanProperty(propertyName, value);
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
