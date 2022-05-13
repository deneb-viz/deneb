import React from 'react';

import { Stack, StackItem } from '@fluentui/react/lib/Stack';
import { SpinButton } from '@fluentui/react/lib/SpinButton';

import store from '../../store';
import { i18nValue } from '../../core/ui/i18n';
import { spinButtonStyles } from '../../core/ui/fluent';
import { getConfig } from '../../core/utils/config';
import { updateSelectionMaxDataPoints } from '../../core/ui/commands';
import ResetButton from '../elements/ResetButton';
import { isCrossFilterPropSet } from '../../features/interactivity';

const SelectionMaxDataPoints: React.FC = () => {
    const { selectionMaxDataPoints } = store(
        (state) => state.visualSettings.vega
    );
    const { minDataPointsValue, maxDataPointsValue, dataPointsStepValue } =
        getConfig().selection;
    const handleChange = React.useCallback(
        (ev: React.FormEvent<HTMLElement>, newValue: string): void => {
            updateSelectionMaxDataPoints(newValue);
        },
        []
    );
    return (
        (isCrossFilterPropSet() && (
            <Stack horizontal>
                <StackItem shrink>
                    <SpinButton
                        min={minDataPointsValue}
                        max={maxDataPointsValue}
                        step={dataPointsStepValue}
                        value={`${selectionMaxDataPoints}`}
                        styles={spinButtonStyles}
                        label={i18nValue('Objects_Vega_SelectionMaxDataPoints')}
                        onChange={handleChange}
                    />
                </StackItem>
                <StackItem shrink>
                    <ResetButton
                        resetPropertyKey='selectionMaxDataPoints'
                        i18nKey='Tooltip_Setting_Reset'
                        location='editor'
                    />
                </StackItem>
            </Stack>
        )) || <></>
    );
};

export default SelectionMaxDataPoints;
