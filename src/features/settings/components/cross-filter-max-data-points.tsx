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
import { getConfig } from '../../../core/utils/config';
import {
    resetProviderPropertyValue,
    updateSelectionMaxDataPoints
} from '../../../core/ui/commands';
import { isCrossFilterPropSet } from '../../interactivity';
import { getI18nValue } from '../../i18n';
import { useSettingsStyles } from '.';
import { logDebug } from '../../logging';
import { TooltipCustomMount } from '../../interface';

const DEFAULT_VALUE = getConfig().propertyDefaults.vega.selectionMaxDataPoints;
const SPIN_RANGES = getConfig().selection;

export const CrossFilterMaxDataPoints: React.FC = () => {
    const {
        visualSettings: {
            vega: { selectionMaxDataPoints }
        }
    } = store((state) => state, shallow);
    const onChange: SpinButtonProps['onChange'] = useCallback(
        (event, data): void => {
            const resolvedValue = getResolvedValue(data);
            updateSelectionMaxDataPoints(
                Math.min(
                    Math.max(resolvedValue, SPIN_RANGES.minDataPointsValue),
                    SPIN_RANGES.maxDataPointsValue
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
                        min={SPIN_RANGES.minDataPointsValue}
                        max={SPIN_RANGES.maxDataPointsValue}
                        step={SPIN_RANGES.dataPointsStepValue}
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
