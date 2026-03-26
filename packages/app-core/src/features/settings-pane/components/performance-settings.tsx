import { useCallback, useMemo } from 'react';
import {
    Button,
    InfoLabel,
    Label,
    MessageBar,
    MessageBarBody,
    SpinButton,
    SpinButtonOnChangeData,
    SpinButtonProps,
    Switch,
    Tooltip,
    useId
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';

import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';
import { useDenebState } from '../../../state';
import { useSettingsPaneStyles } from '../styles';
import { logDebug } from '@deneb-viz/utils/logging';
import { INCREMENTAL_UPDATE_CONFIGURATION } from '../../../lib/vega/incremental-update-configuration';

/**
 * Performance settings panel for compilation and rendering optimizations.
 */
export const PerformanceSettings = () => {
    const classes = useSettingsPaneStyles();
    const tooltipMountNode = useSettingsPaneTooltip();

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

    return (
        <>
            <Switch
                label={
                    <InfoLabel
                        info={translate('Assistive_Text_Performance')}
                        infoButton={{
                            inline: false,
                            popover: { mountNode: tooltipMountNode }
                        }}
                    >
                        {translate('Text_Vega_Performance_IncrementalUpdates')}
                    </InfoLabel>
                }
                checked={enableIncrementalDataUpdates}
                onChange={(_, data) =>
                    setEnableIncrementalDataUpdates(data.checked)
                }
            />
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
                        <Tooltip
                            content={translate('Tooltip_Setting_Reset')}
                            relationship='label'
                            withArrow
                            mountNode={tooltipMountNode}
                        >
                            <Button
                                icon={<ArrowResetRegular />}
                                appearance='subtle'
                                onClick={onReset}
                                disabled={isResetDisabled}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
            {enableIncrementalDataUpdates && (
                <MessageBar
                    shape='rounded'
                    intent={isIncrementalActive ? 'success' : 'warning'}
                >
                    <MessageBarBody>
                        {translate(
                            isIncrementalActive
                                ? 'Assistive_Text_Performance_IncrementalActive'
                                : 'Assistive_Text_Performance_IncrementalInactive'
                        )}
                    </MessageBarBody>
                </MessageBar>
            )}
        </>
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
