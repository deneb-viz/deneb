import React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';
import { isDataPointEnabled } from '../../core/interactivity/selection';

import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { i18nValue } from '../../core/ui/i18n';
import { spinButtonStyles } from '../../core/ui/fluent';
import { getConfig } from '../../core/utils/config';
import { updateSelectionMaxDataPoints } from '../../core/ui/commands';

const SelectionMaxDataPoints: React.FC = () => {
    const { selectionMaxDataPoints } = useSelector(state).visual.settings.vega,
        { minDataPointsValue, maxDataPointsValue, dataPointsStepValue } =
            getConfig().selection,
        handleChange = React.useCallback(
            (ev: React.FormEvent<HTMLElement>, newValue: string): void => {
                updateSelectionMaxDataPoints(newValue);
            },
            []
        );
    return (
        (isDataPointEnabled && (
            <SpinButton
                min={minDataPointsValue}
                max={maxDataPointsValue}
                step={dataPointsStepValue}
                value={`${selectionMaxDataPoints}`}
                styles={spinButtonStyles}
                label={i18nValue('Objects_Vega_SelectionMaxDataPoints')}
                onChange={handleChange}
            />
        )) || <></>
    );
};

export default SelectionMaxDataPoints;
