import { ChangeEvent, useCallback, useMemo } from 'react';
import { Checkbox, CheckboxOnChangeData } from '@fluentui/react-components';

import { useSettingsStyles } from '../styles';
import {
    handlePersistBooleanProperty,
    useDenebState
} from '@deneb-viz/app-core';
import { InteractivityManager } from '../../../lib/interactivity';
import { useDenebVisualState } from '../../../state';

/**
 * Used to denote supported interactivity types within Deneb. These can be used
 * to flag any contextual methods for any particular functionality.
 */
type TInteractivityType = 'tooltip' | 'highlight' | 'select' | 'context';

type InteractivityCheckboxProps = {
    type: TInteractivityType;
};

export const InteractivityCheckbox = ({ type }: InteractivityCheckboxProps) => {
    const { translate } = useDenebState((state) => ({
        translate: state.i18n.translate
    }));
    const { interactivity } = useDenebVisualState((state) => ({
        interactivity: state.settings.vega.interactivity
    }));
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
                label={translate(geti18LabelKey(type))}
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
            return 'PowerBI_Objects_Vega_EnableContextMenu';
        case 'highlight':
            return 'PowerBI_Objects_Vega_EnableHighlight';
        case 'select':
            return 'PowerBI_Objects_Vega_EnableSelection';
        case 'tooltip':
            return 'PowerBI_Objects_Vega_EnableTooltips';
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
