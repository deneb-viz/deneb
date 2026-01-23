import { useCallback, useMemo, useState } from 'react';
import {
    Button,
    Field,
    Label,
    SpinButton,
    SpinButtonOnChangeData,
    SpinButtonProps,
    Switch,
    Tooltip,
    useId
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';

import { SettingsHeadingLabel } from './settings-heading-label';
import { SettingsTextSection } from './settings-text-section';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';
import { TooltipCustomMount } from '../../../components/ui';
import { logDebug } from '@deneb-viz/utils/logging';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega';

/**
 * Performance settings panel for compilation and rendering optimizations.
 */
export const PerformanceSettings = () => {
    const classes = useSettingsPaneStyles();

    const {
        enableIncrementalDataUpdates,
        incrementalUpdateThreshold,
        datasetRowCount,
        setEnableIncrementalDataUpdates,
        setIncrementalUpdateThreshold,
        translate
    } = useDenebState((state) => ({
        enableIncrementalDataUpdates:
            state.compilation.enableIncrementalDataUpdates,
        incrementalUpdateThreshold:
            state.compilation.incrementalUpdateThreshold,
        datasetRowCount: state.dataset.values.length,
        setEnableIncrementalDataUpdates:
            state.compilation.setEnableIncrementalDataUpdates,
        setIncrementalUpdateThreshold:
            state.compilation.setIncrementalUpdateThreshold,
        translate: state.i18n.translate
    }));

    // Determine effective threshold (capped at max)
    const effectiveThreshold = Math.min(
        incrementalUpdateThreshold,
        INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
    );

    // Determine if incremental updates are active for current dataset
    const isIncrementalActive =
        enableIncrementalDataUpdates && datasetRowCount <= effectiveThreshold;

    // SpinButton change handler with validation
    const onThresholdChange: SpinButtonProps['onChange'] = useCallback(
        (_event: unknown, data: SpinButtonOnChangeData): void => {
            const resolvedValue = getResolvedValue(data);
            setIncrementalUpdateThreshold(
                Math.min(
                    Math.max(
                        resolvedValue,
                        INCREMENTAL_UPDATE_CONFIGURATION.minThreshold
                    ),
                    INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold
                )
            );
        },
        [setIncrementalUpdateThreshold]
    );

    // Reset handler
    const onReset = useCallback(() => {
        setIncrementalUpdateThreshold(
            INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold
        );
    }, [setIncrementalUpdateThreshold]);

    // Check if reset should be disabled (already at default)
    const isResetDisabled = useMemo(
        () =>
            incrementalUpdateThreshold ===
            INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold,
        [incrementalUpdateThreshold]
    );

    const spinButtonId = useId();
    const [tooltipRef, setTooltipRef] = useState<HTMLElement | null>();

    return (
        <div className={classes.sectionContainer}>
            <SettingsHeadingLabel>
                {translate('Text_Vega_Performance')}
            </SettingsHeadingLabel>
            <Field
                label={translate('Text_Vega_Performance_IncrementalUpdates')}
            >
                <Switch
                    checked={enableIncrementalDataUpdates}
                    onChange={(_, data) =>
                        setEnableIncrementalDataUpdates(data.checked)
                    }
                />
            </Field>
            {enableIncrementalDataUpdates && (
                <div className={classes.spinButtonContainer}>
                    <Label htmlFor={spinButtonId}>
                        {translate('Text_Vega_Performance_Threshold')}
                    </Label>
                    <div>
                        <SpinButton
                            className={classes.spinButtonControl}
                            appearance='underline'
                            value={incrementalUpdateThreshold}
                            id={spinButtonId}
                            min={INCREMENTAL_UPDATE_CONFIGURATION.minThreshold}
                            max={INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold}
                            step={INCREMENTAL_UPDATE_CONFIGURATION.stepValue}
                            onChange={onThresholdChange}
                        />
                        <>
                            <Tooltip
                                content={translate('Tooltip_Setting_Reset')}
                                relationship='label'
                                withArrow
                                mountNode={tooltipRef}
                            >
                                <Button
                                    icon={<ArrowResetRegular />}
                                    appearance='subtle'
                                    onClick={onReset}
                                    disabled={isResetDisabled}
                                />
                            </Tooltip>
                            <TooltipCustomMount setRef={setTooltipRef} />
                        </>
                    </div>
                </div>
            )}
            <SettingsTextSection>
                {translate(
                    enableIncrementalDataUpdates
                        ? isIncrementalActive
                            ? 'Assistive_Text_Performance_IncrementalActive'
                            : 'Assistive_Text_Performance_IncrementalInactive'
                        : 'Assistive_Text_Performance'
                )}
            </SettingsTextSection>
        </div>
    );
};

/**
 * Resolve the value from SpinButton change data, handling both numeric values and display string parsing.
 */
const getResolvedValue = (data: SpinButtonOnChangeData): number => {
    if (data.value !== undefined && data.value !== null) {
        return data.value;
    } else if (data.displayValue !== undefined) {
        const newValue = parseFloat(data.displayValue);
        if (!Number.isNaN(newValue)) {
            return newValue;
        } else {
            logDebug(`Cannot parse "${data.displayValue}" as a number.`);
            return INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold;
        }
    }
    return INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold;
};
