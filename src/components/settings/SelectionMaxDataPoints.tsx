import React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';
import { isDataPointEnabled } from '../../core/interactivity/selection';

import { IconButton } from '@fluentui/react/lib/Button';
import { Stack, StackItem } from '@fluentui/react/lib/Stack';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

import { i18nValue } from '../../core/ui/i18n';
import { settingsButtonStyles, spinButtonStyles } from '../../core/ui/fluent';
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
        ),
        handleReset = React.useCallback((): void => {
            updateSelectionMaxDataPoints(
                `${getConfig().propertyDefaults.vega.selectionMaxDataPoints}`
            );
        }, []);
    return (
        (isDataPointEnabled && (
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
                    <TooltipHost content={i18nValue('Tooltip_Setting_Reset')}>
                        <IconButton
                            iconProps={{ iconName: 'Reset' }}
                            styles={settingsButtonStyles}
                            onClick={handleReset}
                        />
                    </TooltipHost>
                </StackItem>
            </Stack>
        )) || <></>
    );
};

export default SelectionMaxDataPoints;
