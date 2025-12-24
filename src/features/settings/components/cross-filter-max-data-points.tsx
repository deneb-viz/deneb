import { useCallback, useMemo, useState } from 'react';
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

import { useSettingsStyles } from '../styles';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import {
    handleResetVegaProperty,
    handleSelectionMaxDataPoints,
    TooltipCustomMount,
    useDenebState
} from '@deneb-viz/app-core';
import { logDebug } from '@deneb-viz/utils/logging';
import {
    CROSS_FILTER_LIMITS,
    isCrossFilterPropSet
} from '../../../lib/interactivity';
import { useDenebVisualState } from '../../../state';

const DEFAULT_VALUE = DEFAULTS.vega.selectionMaxDataPoints;

export const CrossFilterMaxDataPoints = () => {
    const { translate } = useDenebState((state) => ({
        translate: state.i18n.translate
    }));
    const { selectionMaxDataPoints } = useDenebVisualState((state) => ({
        selectionMaxDataPoints:
            state.settings.vega.interactivity.selectionMaxDataPoints.value
    }));
    const onChange: SpinButtonProps['onChange'] = useCallback(
        (event, data): void => {
            const resolvedValue = getResolvedValue(data);
            handleSelectionMaxDataPoints(
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
        handleResetVegaProperty('selectionMaxDataPoints');
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
                    {translate('PowerBI_Objects_Vega_SelectionMaxDataPoints')}
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
                            content={translate('PowerBI_Tooltip_Setting_Reset')}
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
