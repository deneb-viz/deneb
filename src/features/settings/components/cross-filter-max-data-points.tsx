import React, { useCallback, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import {
    Button,
    Label,
    SpinButton,
    SpinButtonOnChangeData,
    SpinButtonProps,
    Tooltip,
    useId
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';

import store from '../../../store';
import {
    resetProviderPropertyValue,
    updateSelectionMaxDataPoints
} from '../../../core/ui/commands';
import { isCrossFilterPropSet } from '../../interactivity';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';
import { logDebug } from '../../logging';
import { TooltipCustomMount } from '../../interface';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { CROSS_FILTER_LIMITS } from '@deneb-viz/powerbi-compat/interactivity';

const DEFAULT_VALUE = DEFAULTS.vega.selectionMaxDataPoints;

export const CrossFilterMaxDataPoints: React.FC = () => {
    const {
        visualSettings: {
            vega: {
                interactivity: {
                    selectionMaxDataPoints: { value: selectionMaxDataPoints }
                }
            }
        }
    } = store((state) => state, shallow);
    const onChange: SpinButtonProps['onChange'] = useCallback(
        (event, data): void => {
            const resolvedValue = getResolvedValue(data);
            updateSelectionMaxDataPoints(
                Math.min(
                    Math.max(
                        resolvedValue,
                        CROSS_FILTER_LIMITS.minDataPointsValue
                    ),
                    CROSS_FILTER_LIMITS.maxDataPointsValue
                )
            );
        },
        []
    );
    const onReset = useCallback(() => {
        resetProviderPropertyValue('selectionMaxDataPoints');
    }, []);
    const id = useId();
    const classes = useSettingsStyles();
    const disabled = useMemo(
        () => selectionMaxDataPoints === DEFAULT_VALUE,
        [selectionMaxDataPoints]
    );
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        (isCrossFilterPropSet() && (
            <div className={classes.spinButtonContainer}>
                <Label htmlFor={id}>
                    {getI18nValue('Objects_Vega_SelectionMaxDataPoints')}
                </Label>
                <div>
                    <SpinButton
                        className={classes.spinButtonControl}
                        appearance='underline'
                        value={selectionMaxDataPoints}
                        id={id}
                        min={CROSS_FILTER_LIMITS.minDataPointsValue}
                        max={CROSS_FILTER_LIMITS.maxDataPointsValue}
                        step={CROSS_FILTER_LIMITS.dataPointsStepValue}
                        onChange={onChange}
                    />
                    <>
                        <Tooltip
                            content={getI18nValue('Tooltip_Setting_Reset')}
                            relationship='label'
                            withArrow
                            mountNode={ref}
                        >
                            <Button
                                icon={<ArrowResetRegular />}
                                appearance='subtle'
                                onClick={onReset}
                                disabled={disabled}
                            />
                        </Tooltip>
                        <TooltipCustomMount setRef={setRef} />
                    </>
                </div>
            </div>
        )) || <></>
    );
};

const getResolvedValue = (data: SpinButtonOnChangeData): number => {
    if (data.value !== undefined) {
        return data.value;
    } else if (data.displayValue !== undefined) {
        const newValue = parseFloat(data.displayValue);
        if (!Number.isNaN(newValue)) {
            return newValue;
        } else {
            logDebug(`Cannot parse "${data.displayValue}" as a number.`);
            return DEFAULT_VALUE;
        }
    }
};
